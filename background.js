chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason == "install") {
    console.log("installed");
    chrome.alarms.create("myAlarm", { delayInMinutes: 1, periodInMinutes: 1 });
  } else if (details.reason == "update") {
    chrome.alarms.clearAll();
    chrome.alarms.create("myAlarm", { delayInMinutes: 1, periodInMinutes: 1 });
    console.log("updated");
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  console.log("FROM ALARM");
  hearthBeat();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "addStreamer") {
    let userlogin = request.streamer;
    addStreamer(userlogin, sendResponse);
  } else if (request.message === "deleteStreamer") {
    chrome.storage.local.get(["all"], (data) => {
      var allStreamersArray = data["all"];
      var newArray = allStreamersArray.filter(
        (elem) => elem.login !== request.streamerLogin
      );
      chrome.storage.local.set({ all: newArray });
      sendResponse({ message: "delete_success" });
      console.log("Deleting succed");
    });
  } else if (request.message === "getAllStreamers") {
    getAllStreamers(sendResponse);
  } else if (request.message === "refresh") {
    refresh(sendResponse);
  } else if (request.message === "notify") {
    notifi();
  }

  return true;
});

async function getAllStreamers(sendRes) {
  chrome.storage.local.get(["all"], (data) => {
    let allStreamers = data["all"];
    console.log(allStreamers)
    
    if(!allStreamers) return sendRes({message: "noData"})
    sendRes({ message: "success", data: allStreamers });
  });
}
async function refresh(sendRes) {
  await checkStreams();
  sendRes({ message: "refreshSuccess" });
}
async function hearthBeat() {
  try {
    await checkStreams();
  } catch (error) {
    console.log(error);
  }
}
function addStreamer(userlogin, sendRes) {
  fetch(
    `https://chrome-extension-twitch.herokuapp.com/streamers/streamer?login=${userlogin}`,
    {
      method: "GET",
    }
  )
    .then((res) => {
      if (res.status !== 200) {
        console.log("blad");
        sendRes({ message: "fail" });
        return;
      }
      res.json().then((resjson) => {
        if (!resjson.length) {
          sendRes({ message: "noStreamerWithGivenLogin" });
          return;
        }
        chrome.storage.local.get(["all"], (data) => {
          var allStreamersArray = data["all"];
          // jesli ktos juz byl dodany
          if (allStreamersArray) {
            //sprawdzenie duplikatu // czy ktos o takim loginie zostal juz dodany
            var isAlreadyIn = allStreamersArray.find(
              (s) => s.login === resjson[0].login
            );
            if (typeof isAlreadyIn !== "undefined") {
              console.log("user already added");
              sendRes({
                message: "userAlreadyAdded",
                uLogin: resjson[0].login,
              });
              return;
            }
            allStreamersArray.push({
              login: resjson[0].login,
              display_name: resjson[0].display_name,
              image: resjson[0].profile_image_url,
              online: false,
              stream_data: {},
            });
            chrome.storage.local.set({ all: allStreamersArray });
          }
          else {
            chrome.storage.local.set({
              all: [
                {
                  login: resjson[0].login,
                  display_name: resjson[0].display_name,
                  image: resjson[0].profile_image_url,
                  online: false,
                  stream_data: {},
                },
              ],
            });
          }
          sendRes({ message: "success" });
        });
      });
    })
    .catch((err) => {
      sendRes({ message: "fail" });
    });
}

function checkIfAnyOnlineStreamsAndSetIcon(streamers) {
  let isAnyStreamOnline = false;
  streamers.forEach((stream) => {
    if (stream.online) isAnyStreamOnline = true;
  });

  if (isAnyStreamOnline) {
    chrome.action.setIcon({ path: "/images/alertczerwony.png" });
  } else {
    chrome.action.setIcon({ path: "/images/16white.png" });
  }
}

function checkStreams() {
  var streamers;
  var url = "https://chrome-extension-twitch.herokuapp.com/streamers/streams?";

  return new Promise((resolve, reject) => {
    chrome.storage.local.get(["all"], (data) => {
      streamers = data["all"];
      if (!streamers || !streamers.length) return resolve();

      streamers.forEach((s) => {
        url += "login=" + s.login + "&";
      });

      console.log("======== CHECKING STREAMS ========");
      console.log("URL: ", url);

      fetch(url, {
        method: "GET",
      })
        .then((res) => {
          if (res.status !== 200) {
            console.log("blad z check streams");
            return resolve();
          }
          res.json().then((resjson) => {
            online_streams = resjson;
            streamers.forEach((streamer) => {
              let stream = online_streams.find(
                (stream) => stream.user_login === streamer.login
              );
              if (stream) {
                // jesli ze streamers nie byl online a stream jest online to notifacation
                //do testowania
                if (!streamer.online) notifiy(streamer.login);
                streamer.stream_data = stream;
                streamer.online = true;
              } else {
                streamer.stream_data = {};
                streamer.online = false;
              }
            });
            streamers.sort((a, b) => {
              if (Number(b.online) - Number(a.online) === 1) {
                return 1;
              } else if (Number(b.online) - Number(a.online) === -1) {
                return -1;
              } else {
                if (a.online && b.online) {
                  if (b.stream_data.viewer_count > a.stream_data.viewer_count) {
                    return 1;
                  } else {
                    return -1;
                  }
                } else {
                  return 0;
                }
              }
            });
            chrome.storage.local.set({ all: streamers });

            checkIfAnyOnlineStreamsAndSetIcon(streamers);
            resolve();
          });
        })
        .catch((err) => {
          console.log(err);
          reject("Failed to fetch. API is down.");
        });
    });
  });
}

function notifiy(streamerLogin) {
  chrome.notifications.create("streamer-online-" + streamerLogin, {
    type: "basic",
    iconUrl: "images/128white.png",
    title: "Title placeholder",
    message: streamerLogin + " jest online!",
    contextMessage: "Kliknij na powiadomienie aby włączyć live'a.",
    priority: 2,
  });
  chrome.notifications.onClicked.addListener((id) => {
    if (id !== "streamer-online-" + streamerLogin) return;
    chrome.notifications.clear("streamer-online-" + streamerLogin, () => {
      chrome.tabs.create({
        url: "https://www.twitch.tv/" + streamerLogin,
      });
    });
  });
}

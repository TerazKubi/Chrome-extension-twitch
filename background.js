chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason == "install") {
    console.log("installed");
    chrome.storage.local.set({ notifications: true });
    chrome.storage.local.set({ all: [] });
    chrome.alarms.create("myAlarm", { delayInMinutes: 1, periodInMinutes: 2 });
  } else if (details.reason == "update") {
    chrome.alarms.clearAll();
    chrome.storage.local.set({ notifications: true });
    chrome.alarms.create("myAlarm", { delayInMinutes: 1, periodInMinutes: 2 });
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
      checkForOnlineSetIcon(newArray)
      sendResponse({ message: "delete_success" });
      
    });
  } else if (request.message === "getAllStreamers") {
    getAllStreamers(sendResponse);
  } else if (request.message === "refresh") {
    refresh(sendResponse);
  } else if (request.message === "notificationsOff") {
    notificationsActiveSwap({type: "off"})
  } else if (request.message === "notificationsOn") {
    notificationsActiveSwap({type: "on"})
  } else if (request.message === "getNotificationSetting") {
    chrome.storage.local.get(["notifications"], data => {
      sendResponse({data: data["notifications"]})
    })
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
  try {
    await checkStreams();   
    sendRes({ message: "refreshSuccess" });
  } catch (error) {
    console.log(error)
  }
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
        console.log("error");
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
          
         
          
          if(allStreamersArray.length >= 100) return sendRes({message: "outOfLimit"})
          //check for duplicates
          var isAlreadyIn = allStreamersArray.find(
            (s) => s.login === resjson[0].login
          );
          if (typeof isAlreadyIn !== "undefined") {
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
          
          
          sendRes({ message: "success" , uLogin: resjson[0].login,});
        });
      });
    })
    .catch((err) => {
      console.log(err)
      sendRes({ message: "fail" });
    });
}

function checkForOnlineSetIcon(streamers) {
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

      fetch(url, {
        method: "GET",
      })
        .then((res) => {
          if (res.status !== 200) {
            console.log("error from check streams");
            return resolve();
          }
          res.json().then((resjson) => {
            online_streams = resjson;
            streamers.forEach((streamer) => {
              let stream = online_streams.find(
                (stream) => stream.user_login === streamer.login
              );
              if (stream) {
                // check for stream that wasnt online before
                
                streamer.stream_data = stream;
                if (!streamer.online) notifiy(streamer);
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

            checkForOnlineSetIcon(streamers);
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

function notifiy(streamer) {
  chrome.storage.local.get(["notifications"], (data) => {
    if (data["notifications"]) {
      createNotification(streamer)
    }
  })
}

function createNotification(streamer) {
  chrome.notifications.create("streamer-online-" + streamer.login, {
    type: "image",
    iconUrl: "images/128white.png",
    imageUrl: streamer.stream_data.thumbnail.replace("{width}", "200").replace("{height}", "100"),
    title: "Title placeholder",
    message: streamer.login + " is online!",
    contextMessage: "Click on this notification to watch stream.",
    priority: 2,
  });
  chrome.notifications.onClicked.addListener((id) => {
    if (id !== "streamer-online-" + streamer.login) return;
    chrome.notifications.clear("streamer-online-" + streamer.login, () => {
      chrome.tabs.create({
        url: "https://www.twitch.tv/" + streamer.login,
      });
    });
  });
  
}
function notificationsActiveSwap({type}) {
  if (type === "off") {
    chrome.storage.local.set({ notifications: false });
  } else if ( type === "on") {
    chrome.storage.local.set({ notifications: true });
  }
}

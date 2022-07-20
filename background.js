const CLIENT_ID = encodeURIComponent("nilkx2mp8qu7n709bt8jkx71unc57m");
const SECRET = encodeURIComponent("6n2cdli9g4do4r3kw91pe519euwmjx");
const REDIRECT_URI =
  "https://ahgbjeifinleiaflgpeckjdpleemnchd.chromiumapp.org/";
const RESPONSE_TYPE = encodeURIComponent("token");
const SCOPE = encodeURIComponent("user:read:email");

let user_signed = false;
let ACCESS_TOKEN = null;

function create_twitch_endpoint() {
  let url = `https://id.twitch.tv/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=${RESPONSE_TYPE}&scope=${SCOPE}`;

  console.log(url);
  return url;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "login") {
    login(sendResponse);
  } else if (request.message === "add_streamer") {
    let userlogin = request.streamer;
    if (user_signed) {
      addStreamer(userlogin, sendResponse);
    } else {
      console.log("not logged in");
      login(sendResponse);
      addStreamer(userlogin, sendResponse);
    }
  } else if (request.message === "check_login") {
    if (user_signed) {
      sendResponse({ message: { user_logged_in: true } });
      return;
    }
    sendResponse({ message: { user_logged_in: false } });
  } else if (request.message === "clear") {
    chrome.storage.local.clear();
    console.log("clearing");
    sendResponse({ message: "pogchamp" });
  } else if (request.message === "check") {
    checkStreams(sendResponse);
  } else if (request.message === "delete_streamer") {
    chrome.storage.local.get(["all"], (data) => {
      var allStreamersArray = data["all"];
      var newArray = allStreamersArray.filter(
        (elem) => elem.login !== request.streamerLogin
      );
      chrome.storage.local.set({ all: newArray });
    });
  } else if (request.message === "get_all_streamers") {
    var allStreamers;
    chrome.storage.local.get(["all"], (data) => {
      allStreamers = data["all"];
      console.log(allStreamers);
      sendResponse({ message: "success", data: allStreamers });
    });
  }

  return true;
});

function addStreamer(userlogin, sendRes) {
  fetch(`https://api.twitch.tv/helix/users?login=${userlogin}`, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + ACCESS_TOKEN,
      "Client-Id": CLIENT_ID,
    },
  })
    .then((res) => {
      if (res.status !== 200) {
        console.log("blad");
        sendRes({ message: "fail" });
        return;
      }
      res.json().then((resjson) => {
        chrome.storage.local.get(["all"], (data) => {
          var allStreamersArray = [];
          if (data["all"]) {
            allStreamersArray = data["all"];
            //console.log(allStreamersArray)
            allStreamersArray.push({
              login: resjson.data[0].login,
              display_name: resjson.data[0].display_name,
              image: resjson.data[0].profile_image_url,
            });
            chrome.storage.local.set({ all: allStreamersArray });
          } else {
            chrome.storage.local.set({
              all: [
                {
                  login: resjson.data[0].login,
                  display_name: resjson.data[0].display_name,
                  image: resjson.data[0].profile_image_url,
                },
              ],
            });
          }
          sendRes({ message: "success", data: resjson.data });
        });
      });
    })
    .catch((err) => {
      console.log(err);
    });

  //checkStreams(sendRes)
}
function login(sendRes) {
  if (user_signed) {
    console.log("already signed");
    sendRes({ message: "login_success" });
    return;
  }

  chrome.identity.launchWebAuthFlow(
    { url: create_twitch_endpoint(), interactive: true },
    (redirect_url) => {
      if (
        chrome.runtime.lastError ||
        redirect_url.includes("error=access_denied")
      ) {
        console.log(chrome.runtime.lastError);
        sendRes({ message: "fail" });
        console.log("login fail");
      } else {
        let id_token = redirect_url.substring(
          redirect_url.indexOf("id_token=") + 9
        );
        id_token = id_token.substring(0, id_token.indexOf("&"));
        //console.log("id token: " + id_token)
        ACCESS_TOKEN = redirect_url.substring(
          redirect_url.indexOf("access_token=") + 13
        );
        ACCESS_TOKEN = ACCESS_TOKEN.substring(0, ACCESS_TOKEN.indexOf("&"));
        //console.log("ACCESS TOKEN: " + ACCESS_TOKEN)

        user_signed = true;
        console.log("zalogowano");
        sendRes({ message: "login_success" });
      }
    }
  );
}

function checkStreams(sendRes) {
  var streams;
  var url = "https://api.twitch.tv/helix/streams?";

  chrome.storage.local.get(["all"], (data) => {
    streams = data["all"];
    console.log(streams);
    for (let i = 0; i < streams.length; i++) {
      if (i === streams.length - 1) url += "user_login=" + streams[i].login;
      else url += "user_login=" + streams[i].login + "&";
    }

    console.log(url);
    fetch(url, {
      method: "GET",
      headers: {
        Authorization: "Bearer " + ACCESS_TOKEN,
        "Client-Id": CLIENT_ID,
      },
    })
      .then((res) => {
        if (res.status !== 200) {
          console.log("blad");
          sendRes({ message: "fail" });
          return;
        }
        res.json().then((resjson) => {
          console.log("odp od resjson");
          console.log(resjson.data);
          if (resjson.data.length > 0) {
            sendRes({ message: "success", data: resjson.data });
          }
        });
      })
      .catch((err) => {
        console.log(err);
      });
  });
}

const CLIENT_ID = encodeURIComponent("nilkx2mp8qu7n709bt8jkx71unc57m");
const SECRET = encodeURIComponent("6n2cdli9g4do4r3kw91pe519euwmjx");
const REDIRECT_URI =
  `https://${chrome.runtime.id}.chromiumapp.org/`;
const RESPONSE_TYPE = encodeURIComponent("token");
const SCOPE = encodeURIComponent("user:read:email");

let user_signed = false
let ACCESS_TOKEN = null
let isLoginPopupActive = false

function create_twitch_endpoint() {
  let url = `https://id.twitch.tv/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=${RESPONSE_TYPE}&scope=${SCOPE}`;
  //console.log(url);
  return url;
}
chrome.runtime.onInstalled.addListener(function(details){
  if(details.reason == "install"){
    console.log("installed")
    chrome.alarms.create("myAlarm", {delayInMinutes: 1, periodInMinutes: 1} )
  }else if(details.reason == "update"){
    chrome.alarms.clearAll()
    chrome.alarms.create("myAlarm", {delayInMinutes: 1, periodInMinutes: 1} )
    console.log("updated")
  }
});
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log("FROM ALARM")
  hearthBeat()
  //here check if streamers are online
  //przeniesc logike sprawdzania do backgound alarmu
  //zapisywac w storagu
  // w pop upie dodac refresh button i refreshowac po otwarciu popupa
  // chrome.notifications.create('test', {
  //   type: 'basic',
  //   iconUrl: 'images/icon-16x16.png',
  //   title: 'Test Message',
  //   message: 'You are awesome!',
  //   priority: 2
  // })
})



chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "login") {

    loginListener(sendResponse)
    
  } 
  else if (request.message === "addStreamer") {

    let userlogin = request.streamer;
    if (user_signed) {
      addStreamer(userlogin, sendResponse);
    } else {
      console.log("not logged in");
      login(sendResponse);
      addStreamer(userlogin, sendResponse);
    }

  } 
  else if (request.message === "deleteStreamer") {

    chrome.storage.local.get(["all"], (data) => {
      var allStreamersArray = data["all"]
      var newArray = allStreamersArray.filter(
        (elem) => elem.login !== request.streamerLogin
      )
      chrome.storage.local.set({ all: newArray })
      sendResponse({ message: "delete_success" })
      console.log("Deleting succed")
    })

  } 
  else if (request.message === "getAllStreamers") {

    getAllStreamers(sendResponse)

  }
  else if (request.message === "clear") {

    chrome.storage.local.clear();
    console.log("clearing");
    sendResponse({ message: "pogchamp" })

  } 
  else if (request.message === "refresh") {

    refresh(sendResponse)
    //sendResponse()
    
    
  } 

  return true;
});

async function getAllStreamers(sendRes) {

  //await checkStreams()
  chrome.storage.local.get(["all"], (data) => {
    let allStreamers = data["all"]
    //console.log(allStreamers);
    sendRes({ message: "success", data: allStreamers })
  })
}
async function refresh(sendRes) {

  await checkStreams()
  sendRes({message: "refreshSuccess"})
}
async function hearthBeat() {
  if (!isLoginPopupActive) await login()
  if (user_signed) await checkStreams()
  await checkIfAnyOnlineStreamsAndSetIcon()
}
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
              online: false,
              stream_data: {}
            });
            chrome.storage.local.set({ all: allStreamersArray });
          } else {
            chrome.storage.local.set({
              all: [
                {
                  login: resjson.data[0].login,
                  display_name: resjson.data[0].display_name,
                  image: resjson.data[0].profile_image_url,
                  online: false,
                  stream_data: {}        
                },
              ],
            });
          }
          sendRes({ message: "success" });
        });
      });
    })
    .catch((err) => {
      console.log(err);
    });

  //checkStreams(sendRes)
}
function login() {
  return new Promise((resolve, reject) => {
    if (user_signed) {
      console.log("already signed");
      //sendRes({ message: "login_success" });
      resolve()
    }
    else {
      isLoginPopupActive = true
      //make sure that your browser has enabled cookies
      chrome.identity.launchWebAuthFlow(
        { url: create_twitch_endpoint(), interactive: true }, (redirect_url) => {
          if (chrome.runtime.lastError || redirect_url.includes("error=access_denied")) {
            console.log(chrome.runtime.lastError);
            //console.log(redirect_url);
            //sendRes({ message: "fail" });
            reject()
            console.log("login fail");
          } else {
            let id_token = redirect_url.substring(redirect_url.indexOf("id_token=") + 9);
            id_token = id_token.substring(0, id_token.indexOf("&"));
            //console.log("id token: " + id_token)
            ACCESS_TOKEN = redirect_url.substring(redirect_url.indexOf("access_token=") + 13);
            ACCESS_TOKEN = ACCESS_TOKEN.substring(0, ACCESS_TOKEN.indexOf("&"));
            console.log("ACCESS TOKEN: " + ACCESS_TOKEN)
  
            user_signed = true;
            isLoginPopupActive = false
            console.log("zalogowano");
            //sendRes({ message: "login_success" });
            resolve()
          }
        }
      )
    }
  })
  

}

async function loginListener(sendRes) {
  try {
    await login()   
  } catch (error) {
    sendRes({message: "loginFail"})
  }
  sendRes({message: "loginSuccess"})
}

function checkIfAnyOnlineStreamsAndSetIcon() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(["all"], (data) => {
      // TO DO ================================================================================
      streamers = data['all']
      let isAnyStreamOnline = false
      streamers.forEach(stream => {
        if (stream.online) isAnyStreamOnline = true
      
      })

      if (isAnyStreamOnline) {
        console.log("jest ktos online zmiana icony")
        chrome.action.setIcon({ path: "/images/sample-icon.png" })
      } else {
        console.log("nikt nie jest ktos online zmiana icony")
        chrome.action.setIcon({ path: "/images/icon-16x16.png" })
      }
    })
  })
}

function checkStreams() {
  var streamers;
  var url = "https://api.twitch.tv/helix/streams?";

  return new Promise((resolve, reject) => {
    chrome.storage.local.get(["all"], (data) => {
      streamers = data["all"];
      console.log("CHECKING STREAMS ")
      //console.log(streamers)
      if(!streamers) {
        resolve()
      }
  
      for (let i = 0; i < streamers.length; i++) {
        if (i === streamers.length - 1) url += "user_login=" + streamers[i].login;
        else url += "user_login=" + streamers[i].login + "&";
      }
  
      fetch(url, {
        method: "GET",
        headers: {
          Authorization: "Bearer " + ACCESS_TOKEN,
          "Client-Id": CLIENT_ID,
        },
      })
        .then((res) => {
          if (res.status !== 200) {
            console.log("blad z check streams probably bad access token")
            
            return
          }
          res.json().then((resjson) => {
            //console.log("odp od resjson");
            //console.log(resjson.data);
            if (resjson.data.length > 0) {
  
              online_streams = resjson.data
  
              streamers.forEach( streamer => {
                
                let stream = online_streams.find(stream => stream.user_login === streamer.login)
                if(stream) {
                  streamer.stream_data = stream
                  streamer.online = true
                } else {
                  streamer.stream_data = {}
                  streamer.online = false
                }
  
              })
              //console.log("tablcia streamers po sprawdzeniu z funkcji checkStreams/refresh")
              //console.log(streamers)
  
              streamers.sort((a,b) => {
                if ( (Number(b.online) - Number(a.online)) === 1 ) {
                  return 1
                } else if ( (Number(b.online) - Number(a.online)) === -1 ) {
                  return -1
                } else {
                  if ( a.online && b.online ){
                    if ( b.stream_data.viewer_count > a.stream_data.viewer_count ) {
                      return 1
                    } else {
                      return -1
                    }
                  } else {
                    return 0
                  }
                }
  
              })
              console.log("AFTER CHECKING: ")
              console.log(streamers)
              chrome.storage.local.set({ all: streamers });
              //sendRes({message: "res from refresh"})
              resolve()
            } else {
              //when resjson is empty
              resolve()
            }
          });
        })
        .catch((err) => {
          console.log(err);
          reject()
        });
    });
  })
  
}

chrome.runtime.onInstalled.addListener(function(details){
  if(details.reason == "install"){
    console.log("installed")
    chrome.alarms.create("myAlarm", {delayInMinutes: 1, periodInMinutes: 1} )
  }else if(details.reason == "update"){
    chrome.alarms.clearAll()
    chrome.alarms.create("myAlarm", {delayInMinutes: 1, periodInMinutes: 1} )
    console.log("updated")
  }
})

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

  if (request.message === "addStreamer") {

    let userlogin = request.streamer;    
    addStreamer(userlogin, sendResponse);
    

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
  try {
    await checkStreams()
  } catch (error) {
    console.log(error)
  }
  
}
function addStreamer(userlogin, sendRes) {
  fetch(`https://chrome-extension-twitch.herokuapp.com/streamers/streamer?login=${userlogin}`, {
    method: "GET"
  })
    .then((res) => {
      if (res.status !== 200) {
        console.log("blad");
        sendRes({ message: "fail" });
        return;
      }
      res.json().then((resjson) => {
        
        if(!resjson.length){
          sendRes({message: "noStreamerWithGivenLogin"})
          return
        } 
        chrome.storage.local.get(["all"], (data) => {         
          var allStreamersArray = data["all"];
          //console.log(resjson)
          // jesli ktos juz byl dodany
          if (allStreamersArray) {         
            //sprawdzenie duplikatu // czy ktos o takim loginie zostal juz dodany
            var isAlreadyIn = allStreamersArray.find( s => s.login === resjson[0].login)
            //console.log(isAlreadyIn)
            if(typeof isAlreadyIn !== "undefined") {
              console.log("user already added")
              sendRes({message: "userAlreadyAdded", uLogin: resjson[0].login})
              return
            }

            allStreamersArray.push({
              login: resjson[0].login,
              display_name: resjson[0].display_name,
              image: resjson[0].profile_image_url,
              online: false,
              stream_data: {}
            });
            chrome.storage.local.set({ all: allStreamersArray });
          } 
          // jesli nikt jeszcze nie byl dodany //pierwsze odpalenie zaraz po zainstalowaniu gdzie w local storage nie ma nic wprowadzone
          else {
            chrome.storage.local.set({
              all: [
                {
                  login: resjson[0].login,
                  display_name: resjson[0].display_name,
                  image: resjson[0].profile_image_url,
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
      //console.log(err);
      sendRes({message: "fail"})
    });

  
}

function checkIfAnyOnlineStreamsAndSetIcon(streamers) {
  
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
}

function checkStreams() {
  var streamers;
  var url = "https://chrome-extension-twitch.herokuapp.com/streamers/streams?";

  return new Promise((resolve, reject) => {
    chrome.storage.local.get(["all"], (data) => {
      streamers = data["all"];
      if(!streamers || !streamers.length) return resolve()
      console.log("CHECKING STREAMS ")
      console.log(streamers)
      
  
      for (let i = 0; i < streamers.length; i++) {
        if (i === streamers.length - 1) url += "login=" + streamers[i].login;
        else url += "login=" + streamers[i].login + "&";
      }
  
      fetch(url, {
        method: "GET"
      })
        .then((res) => {
          if (res.status !== 200) {
            console.log("blad z check")
            
            return resolve()
          }
          res.json().then((resjson) => {
            //console.log("odp od resjson");
            //console.log(resjson.data);
            if (resjson.length > 0) {
  
              online_streams = resjson
  
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
              checkIfAnyOnlineStreamsAndSetIcon(streamers)
              chrome.storage.local.set({ all: streamers });
              //sendRes({message: "res from refresh"})
              resolve()
            } else {
              //when resjson is empty
              checkIfAnyOnlineStreamsAndSetIcon(streamers)
              resolve()
            }
          });
        })
        .catch((err) => {
          console.log(err);
          reject("Failed to fetch. API is down.")
        });
    });
  })
  
}

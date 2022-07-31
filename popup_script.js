const addStreamerBtn = document.querySelector("#addStreamerBtn")
const refreshBtn = document.querySelector("#refreshBtn")
const streamerNameInput = document.querySelector("#inputStreamerName")
const streamersDiv = document.querySelector(".streamers")
const output = document.querySelector(".output")
const title = document.querySelector(".title")



// event listeners
refreshBtn.addEventListener("click", e => {
    refresh()
})
addStreamerBtn.addEventListener("click", (e)=>{
    addStreamer()   
})


//at the start when user open pop up window
start()


function login(){
    
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({message: "login"}, (res)=>{
            //console.log(res)
            if (res.message === "loginSuccess" || res.message === "already_signed"){
                title.innerHTML = "<p>Logged in</p>"
                resolve()               
            } else {
                reject()
            }              
        })
    })  
}

function delStreamer(streamerLogin) {

    var streamerDiv = document.querySelector("#"+streamerLogin)  
    chrome.runtime.sendMessage({message: "deleteStreamer", streamerLogin: streamerLogin}, (res)=>{
        if ( res.message === "delete_success" ) {
            streamerDiv.remove()
        }
    })
}

function getStreamersFromStorageAndDisplay(){

    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({message: "getAllStreamers"}, (res)=>{
            console.log("loading data from storage and displaying it")
                   
            let streamersData = res.data
            if (streamersData) {
                console.log(streamersData)
                streamersDiv.innerHTML = ""
                streamersData.forEach((s) => {
                    const newStreamerDiv = document.createElement("div")
                    newStreamerDiv.setAttribute("id", s.login)                
                    newStreamerDiv.classList.add("streamer")
                    if(s.online) {
                        newStreamerDiv.innerHTML = "<img  src='" + s.image+ "'>"
                        newStreamerDiv.innerHTML += "<div id='name" + s.login + "'>" + s.display_name + " " + s.stream_data.game_name +" " + s.stream_data.viewer_count+ " " + "</div>"    
                        newStreamerDiv.setAttribute("title", s.stream_data.title)                      
                    } else {
                        newStreamerDiv.innerHTML = "<img  class='img_offline' src='" + s.image+ "'><div id='name" + s.login + "'>" + s.display_name + "------- </div>"
                    }
                    newStreamerDiv.addEventListener("click", (e) => {
                        if (e.target !== newStreamerDiv) return
                        const newUrl = "https://www.twitch.tv/" + s.login
                        chrome.tabs.create({url: newUrl })
                    })
                    let delBtn = document.createElement("input")
                    delBtn.setAttribute('type', 'button')
                    delBtn.setAttribute('value', 'usun')
                    delBtn.addEventListener("click", (e)=>{
                        delStreamer(s.login)
                    })
                    newStreamerDiv.appendChild(delBtn)
                    streamersDiv.appendChild(newStreamerDiv)
                })
                resolve()
            } else {
                reject()
            }
            // else {} show some instruction while no streamers are added
        })
          
    })
    
}

function refresh() {
    chrome.runtime.sendMessage({message: "refresh"}, (res)=>{
        if (res.message === "refreshSuccess") {
            getStreamersFromStorageAndDisplay()
        }
    })
}
function addStreamer() {
    var userInput = streamerNameInput.value
    if (userInput === "") return

    chrome.runtime.sendMessage({message: "addStreamer", streamer: userInput}, (res)=>{

        if(res.message === "success") refresh()
        else output.innerHTML = "error"
                
    })
    streamerNameInput.value = ""
    streamerNameInput.focus()
}

async function start() {

    await login()
    await getStreamersFromStorageAndDisplay()

    setInterval(() => {
        console.log("auto refresh")
        getStreamersFromStorageAndDisplay()
    }, 30000)

}
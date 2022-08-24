const addStreamerBtn = document.querySelector("#addStreamerBtn")
const streamerNameInput = document.querySelector("#inputStreamerName")
const streamersDiv = document.querySelector(".streamers-container")
const output = document.querySelector(".output")
const hideBtn = document.querySelector("#hideAddStreamerContainer")
const showBtn = document.querySelector("#showAddStreamerContainer")

const addStreamerContainer = document.querySelector(".add-streamer-container")

let isAddStreamerContainerActive = false

// event listeners


addStreamerBtn.addEventListener("click", (e)=>{
    addStreamer()   
})
hideBtn.addEventListener("click", (e) => {
    addStreamerContainer.style.display = "none"
    isAddStreamerContainerActive = false
    
})
showBtn.addEventListener("click", (e) => {
    addStreamerContainer.style.display = "inline"
    streamerNameInput.focus()   
    isAddStreamerContainerActive = true

})
addStreamerContainer.addEventListener("keypress", e => {
    if (e.key === 'Enter' && isAddStreamerContainerActive){
        addStreamer()
    }
})
document.addEventListener("click", e => {
    if(!addStreamerContainer.contains(e.target) && e.target !== showBtn) {
        addStreamerContainer.style.display = "none"  
        isAddStreamerContainerActive = false
    }
})


//at the start when user open pop up window
start()




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
            if (!streamersData) reject()

            console.log(streamersData)
            streamersDiv.innerHTML = ""
            streamersData.forEach((s) => {
                const newStreamerDiv = document.createElement("div")
                newStreamerDiv.setAttribute("id", s.login)
                newStreamerDiv.classList.add("streamer")
                              
                if(s.online) {
                    newStreamerDiv.innerHTML = "<img  src='" + s.image+ "'>"
                    newStreamerDiv.innerHTML += 
                    "<div id='name" + s.login + "'>" + 
                        "<div class='streamer-display-name'>" + s.display_name + "</div>" +  
                        "<div class='streamer-stream-category'>" + s.stream_data.game_name + "</div>" +
                        "<div class='streamer-live-icon-container'><div class='streamer-live-dot'></div>LIVE</div>"+
                        "<div class='streamer-viewer-count'>" + s.stream_data.viewer_count + "</div>" +
                        "</div>"    
                    newStreamerDiv.setAttribute("title", s.stream_data.title)    
                    newStreamerDiv.addEventListener("click", (e) => {
                        if (e.target !== newStreamerDiv) return
                        const newUrl = "https://www.twitch.tv/" + s.login
                        chrome.tabs.create({url: newUrl })
                    })              
                    if (s.login === "xayoo_") {
                        newStreamerDiv.classList.add("golden-user")
                    } else {
                        newStreamerDiv.classList.add("clickable")
                    }
                } else {
                    newStreamerDiv.innerHTML = "<img  class='img_offline' src='" + s.image+ "'>"
                    newStreamerDiv.innerHTML += 
                    "<div id='name" + s.login + "'>" + 
                        "<div class='streamer-display-name display-name-offline'>" + s.display_name + "</div>" +  
                        "<div class='offline-text-container'>Offline</div>" +                          
                        "</div>"                   
                }                   
                let delBtn = document.createElement("div")
                delBtn.innerHTML = "<img src='./images/trash-2.png'>"
                delBtn.classList.add("delete-streamer")
                delBtn.addEventListener("click", (e)=>{
                    delStreamer(s.login)
                })
                newStreamerDiv.appendChild(delBtn)
                streamersDiv.appendChild(newStreamerDiv)
            })
            resolve()
            
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
    streamerNameInput.disabled = true
    streamerNameInput.value = ""

    chrome.runtime.sendMessage({message: "addStreamer", streamer: userInput}, (res)=>{

        if(res.message === "success") refresh()
        else if(res.message === "userAlreadyAdded") showInfo(res.uLogin + " jest już dodany")
        else if(res.message === "noStreamerWithGivenLogin") showInfo("Nie ma takiego streamera")
        else if(res.message === "fail") showInfo("Błąd serwera")
        else showInfo("error")
             
        streamerNameInput.disabled = false     
        streamerNameInput.focus()
    })
}

async function start() {
    console.log("start")
    //await getStreamersFromStorageAndDisplay()
    refresh()

    setInterval(() => {
        console.log("auto refresh")
        getStreamersFromStorageAndDisplay()
    }, 10000)

}
function showInfo(txt){
    output.innerHTML = txt
    setTimeout(()=>{
        output.innerHTML = ""
    },7000)
}

function notifi() {
    chrome.runtime.sendMessage({message: "notify"}, (res)=>{

        
    })
}
async function reloadBackGround() {
    
}
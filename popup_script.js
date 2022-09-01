const addStreamerBtn = document.querySelector("#addStreamerBtn")
const streamerNameInput = document.querySelector("#inputStreamerName")
const streamersDiv = document.querySelector(".streamers-container")
const output = document.querySelector(".output")
const addStreamerOutput = document.querySelector(".add-streamer-output-container")
const hideBtn = document.querySelector("#hideAddStreamerContainer")
const showBtn = document.querySelector("#showAddStreamerContainer")
const loader = document.querySelector(".loader")
const bell = document.querySelector(".bell-container ")

const addStreamerContainer = document.querySelector(".add-streamer-container")

let isAddStreamerContainerActive = false
let notificationsAvtive = true

// event listeners
addStreamerBtn.addEventListener("click", e=>{
    addStreamer()   
})
hideBtn.addEventListener("click", e => {
    addStreamerContainer.style.display = "none"
    isAddStreamerContainerActive = false
    
})
showBtn.addEventListener("click", e => {
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
bell.addEventListener("click", (e) => {
    if (notificationsAvtive) {
        document.querySelector(".line").style.display = "inline"
        notificationsAvtive = false
        chrome.runtime.sendMessage({message: "notificationsOff"})
    } else {
        document.querySelector(".line").style.display = "none"
        notificationsAvtive = true
        chrome.runtime.sendMessage({message: "notificationsOn"})
    }
})


//at the start when user open pop up window
start()




function delStreamer(streamerLogin) {

    var streamerDiv = document.querySelector("#"+streamerLogin)  
    chrome.runtime.sendMessage({message: "deleteStreamer", streamerLogin: streamerLogin}, (res)=>{
        if ( res.message === "delete_success" ) {
            streamerDiv.remove()
            showTutorial(streamersDiv.childNodes)
        }
    })
}

function getStreamersAndDisplay(){

    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({message: "getAllStreamers"}, (res)=>{
            console.log("loading data from storage and displaying it")
                   
            if(res.message === "noData") return reject()
            let streamersData = res.data
            if (!streamersData) return reject()

            streamersDiv.innerHTML = ""
            streamersData.forEach((s) => {
                const newStreamerDiv = document.createElement("div")
                newStreamerDiv.setAttribute("id", s.login)
                newStreamerDiv.classList.add("streamer")

                let delBtn = document.createElement("div")
                delBtn.innerHTML = "<img src='./images/trash-2.png'>"
                delBtn.classList.add("delete-streamer")        
                delBtn.addEventListener("click", e => {
                    e.stopPropagation()
                    delStreamer(s.login)
                })       
                              
                if(s.online) {
                    newStreamerDiv.innerHTML = `<img  class='unselectable' src='${s.image}'>                 
                    <div id='container-${s.login}'>
                        <div class='streamer-display-name unselectable'>${s.display_name} </div>  
                        <div class='streamer-stream-category unselectable'>${s.stream_data.game_name}</div>
                        <div class='streamer-live-icon-container'><div class='streamer-live-dot'></div>LIVE</div>
                        <div class='streamer-viewer-count unselectable'>${s.stream_data.viewer_count}</div>
                    </div>`   
                    newStreamerDiv.setAttribute("title", s.stream_data.title)   
                      
                    newStreamerDiv.addEventListener("click", (e) => {                  
                        const newUrl = "https://www.twitch.tv/" + s.login
                        chrome.tabs.create({url: newUrl })
                    }) 
                   
                    const im = newStreamerDiv.getElementsByTagName("img")[0]
                    console.log(im)
                    newStreamerDiv.addEventListener("mouseover", e=>{
                        im.src = s.stream_data.thumbnail.replace("{width}", "60").replace("{height}", "60")
                        
                        
                        return false
                    })
                    newStreamerDiv.addEventListener("mouseout", e=>{
                        im.src =  s.image
                        //newStreamerDiv.removeChild(prewievStreamDiv)
                        //prewievStreamDiv.style.display = "none"
                        return false
                    })
                    
                    
                                  
                    if (s.login === "xayoo_") newStreamerDiv.classList.add("golden-user")
                    else newStreamerDiv.classList.add("clickable")
                    
                } else {
                    newStreamerDiv.innerHTML = "<img  class='img_offline' src='" + s.image+ "'>"
                    newStreamerDiv.innerHTML += 
                    "<div id='name" + s.login + "'>" + 
                        "<div class='streamer-display-name display-name-offline unselectable'>" + s.display_name + "</div>" +  
                        "<div class='offline-text-container unselectable'>Offline</div>" +                          
                        "</div>"                   
                }                   
                newStreamerDiv.appendChild(delBtn)
                streamersDiv.appendChild(newStreamerDiv)
            })
            showTutorial(streamersData)
            resolve()
            
            // else {} show some instruction while no streamers are added
        })         
    }) 
}
function showTutorial(streamersArray) {
    if(!streamersArray.length) {
        const tutorial = document.createElement("div")
        tutorial.classList.add("tutorial")
        tutorial.classList.add("unselectable")
        tutorial.innerHTML = "Add some streamers by clicking plus icon below"
        streamersDiv.appendChild(tutorial)
    }
}
function refresh() {
    chrome.runtime.sendMessage({message: "refresh"}, (res)=>{
        if (res.message === "refreshSuccess") {
            try {
                
                getStreamersAndDisplay()
            } catch (error) {
                console.log(error)
            }
        }
    })
}

function addStreamer() {
    var userInput = streamerNameInput.value
    if (userInput === "") return
    streamerNameInput.disabled = true
    streamerNameInput.value = ""
    loader.style.display = "inline"

    chrome.runtime.sendMessage({message: "addStreamer", streamer: userInput}, (res)=>{

        if(res.message === "success"){ 
            refresh()
            showInfo(addStreamerOutput, "<img src='./images/check.png' >")
        }
        else if(res.message === "userAlreadyAdded") showInfo(addStreamerOutput, "<img src='./images/redxmark.png' class='error-icon'>" + res.uLogin + " is already added.")
        else if(res.message === "noStreamerWithGivenLogin") showInfo(addStreamerOutput, "<img src='./images/redxmark.png' class='error-icon'>" + "No streamer with given login.")
        else if(res.message === "outOfLimit") showInfo(addStreamerOutput, "<img src='./images/redxmark.png' class='error-icon'>" + "You cant add more than 100 streamers.")
        else if(res.message === "fail") showInfo(addStreamerOutput, "<img src='./images/redxmark.png' class='error-icon'>" + "Server error.")
        else showInfo(addStreamerOutput, "<img src='./images/redxmark.png' class='error-icon'>" + "Error.")
             
        streamerNameInput.disabled = false     
        streamerNameInput.focus()
        //loader.style.display = "none"
    })
}

async function start() {
    console.log("start")
    chrome.runtime.sendMessage({message: "getNotificationSetting"}, res => {
        if(!res.data) {
            document.querySelector(".line").style.display = "inline"
            notificationsAvtive = false
        }
    })
    refresh()

    setInterval(() => {
        console.log("auto refresh")
        try {
            
            getStreamersAndDisplay()
        } catch (error) {
            console.log(error)
        }
    }, 30000)
}
function showInfo(output, txt){
    output.innerHTML = txt
    setTimeout(()=>{
        output.innerHTML = ""
    },30000)
}



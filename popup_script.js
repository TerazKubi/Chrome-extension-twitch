const addStreamerBtn = document.querySelector("#addStreamerBtn")
const clearBtn = document.querySelector("#clearBtn")
const refreshBtn = document.querySelector("#refreshBtn")
const streamerNameInput = document.querySelector("#inputStreamerName")
const streamersDiv = document.querySelector(".streamers")
const output = document.querySelector(".output")
const title = document.querySelector(".title")





// loginBtn.addEventListener("click", e => {
//     login()
// })

//at the start read 
clearBtn.addEventListener("click", e => {
    console.log("click")
    chrome.runtime.sendMessage({message: "clear"}, (res)=>{
        console.log(res.message)
    })
})

refreshBtn.addEventListener("click", e => {
    //refresh
    chrome.runtime.sendMessage({message: "refresh"}, (res)=>{
        getStreamersFromStorageAndDisplay()
    })
})
addStreamerBtn.addEventListener("click", (e)=>{

    var userInput = streamerNameInput.value
    if (userInput === "") return

    chrome.runtime.sendMessage({message: "add_streamer", streamer: userInput}, (res)=>{
        if(res.message === "success"){
            console.log(res.data)
            console.log(res)
            if(res.data.length > 0) {
                let streamerData = res.data[0]
                const newStreamerDiv = document.createElement("div")
                newStreamerDiv.setAttribute("id", streamerData.login)
                newStreamerDiv.classList.add("streamer")
                newStreamerDiv.innerHTML = "<img id='profile_img"+ streamerData.login +"' class='img_offline' src='" + streamerData.profile_image_url+ "'></div><div id='name" + streamerData.login + "'>" + streamerData.display_name + "------- </div>"               
                let delBtn = document.createElement("input")
                delBtn.setAttribute('type', 'button')
                delBtn.setAttribute('value', 'usun')
                delBtn.addEventListener("click", (e)=>{
                    delStreamer(streamerData.login)
                })
                newStreamerDiv.appendChild(delBtn)
                streamersDiv.appendChild(newStreamerDiv)
            } else {
                output.innerHTML = "nie ma takiego strymera"
            }
        } 
        else {
            output.innerHTML = "error"
        }
        
    })
    streamerNameInput.value = ""
    streamerNameInput.focus()
})

//at the start when user open pop up window
//is_user_logged_in()
start()


function login(resolve){
    
    chrome.runtime.sendMessage({message: "login"}, (res)=>{
        console.log(res)
        if (res.message === "login_success" || res.message === "already_signed"){
            title.innerHTML = "<p>Logged in</p>"
            
        } 
        resolve()
            
    })
    
    
}

function delStreamer(streamerLogin) {
    var streamerDiv = document.querySelector("#"+streamerLogin)
    streamerDiv.remove()
    chrome.runtime.sendMessage({message: "delete_streamer", streamerLogin: streamerLogin}, (res)=>{
        
    })
}

function getStreamersFromStorageAndDisplay(){
    
    chrome.runtime.sendMessage({message: "get_all_streamers"}, (res)=>{
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
                    newStreamerDiv.innerHTML += "<div id='name" + s.login + "'>" + s.display_name + " " + s.stream_data.game_name +" " + s.stream_data.viewer_count+ " " + s.stream_data.title + "</div>"
                    

                } else {
                    newStreamerDiv.innerHTML = "<img  class='img_offline' src='" + s.image+ "'><div id='name" + s.login + "'>" + s.display_name + "------- </div>"
                }
                
                let delBtn = document.createElement("input")
                delBtn.setAttribute('type', 'button')
                delBtn.setAttribute('value', 'usun')
                delBtn.addEventListener("click", (e)=>{
                    delStreamer(s.login)
                })
                newStreamerDiv.appendChild(delBtn)
                streamersDiv.appendChild(newStreamerDiv)
            })
        }
       
        
        
    })
    
}

// function checkStreams(){
    
//     chrome.runtime.sendMessage({message: "check"}, (res)=>{
//         console.log(res.message)
//         if(res.message === "success") {
//             console.log(res.data)
//             for (let i = 0; i < res.data.length; i++){
//                 var div = document.querySelector("#name" + res.data[i].user_login)
//                 div.innerHTML = res.data[i].user_name + " gierka: " + res.data[i].game_name + " widzowie: " + res.data[i].viewer_count + " " + res.data[i].title
//                 var profile_img = document.querySelector("#profile_img" + res.data[i].user_login)
//                 profile_img.classList.remove('img_offline')
//             }
//         }
//         else if ( res.message === "fail") {
//             console.log("fail z popup")
//         }
//         else if (res.message === " empty") {
//             console.log("no streams to check")
//         }
            
        
//     })
// }
function start() {
    var prom = new Promise( (resolve, reject) => {
        login(resolve)
        console.log("przed login")
        
    })

    prom.then(()=>{
        console.log("po login")
        getStreamersFromStorageAndDisplay()
        console.log("wyswietlono dane ze storge")
    })

    
}
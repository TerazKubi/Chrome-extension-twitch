const addStreamerBtn = document.querySelector("#addStreamerBtn")
const clearBtn = document.querySelector("#clearBtn")
const checkBtn = document.querySelector("#checkBtn")
const loginBtn = document.querySelector("#loginBtn")
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

checkBtn.addEventListener("click", e => {
    checkStreams()
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
                newStreamerDiv.innerHTML = "<img src='" + streamerData.profile_image_url+ "'>" + "<div id='dot"+ streamerData.login +"' class='offline dot'></div><div id='name" + streamerData.login + "'>" + streamerData.display_name + "------- </div>"
                //newStreamerDiv.innerHTML += "<div id='name" + streamerData.login + "'>" + streamerData.display_name + "------- </div>"
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
            loginBtn.classList.add("loginBtnDisable")
        } 
        resolve()
            
    })
    
    
}
function is_user_logged_in(){
    chrome.runtime.sendMessage({message: "check_login"}, (res)=>{
        if(res.message.user_logged_in){
            title.innerHTML = "<p>Logged in</p>"
            loginBtn.classList.add("loginBtnDisable")
            getStreamersFromStorageAndDisplay()
        }else{
            title.innerHTML = "<p>Log in</p>"
            loginBtn.classList.remove("loginBtnDisable")
        }
    })
}
function delStreamer(streamerLogin) {
    var streamerDiv = document.querySelector("#"+streamerLogin)
    streamerDiv.remove()
    chrome.runtime.sendMessage({message: "delete_streamer", streamerLogin: streamerLogin}, (res)=>{
        
    })
}

function getStreamersFromStorageAndDisplay(resolve){
    
    chrome.runtime.sendMessage({message: "get_all_streamers"}, (res)=>{
        console.log("loading data from storage and displaying it")
        if (res.data.length < 1) return

        let streamersData = res.data
        console.log(streamersData)
        streamersData.forEach((s) => {
            const newStreamerDiv = document.createElement("div")
            newStreamerDiv.setAttribute("id", s.login)
            newStreamerDiv.classList.add("streamer")
            newStreamerDiv.innerHTML = "<img src='" + s.image+ "'>" + "<div id='dot"+ s.login +"' class='offline dot'></div><div id='name" + s.login + "'>" + s.display_name + "------- </div>"
            
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
    })
    
}

function checkStreams(){
    
    chrome.runtime.sendMessage({message: "check"}, (res)=>{
        console.log(res.message)
        if(res.message === "success") {
            console.log(res.data)
            for (let i = 0; i < res.data.length; i++){
                var div = document.querySelector("#name" + res.data[i].user_login)
                div.innerHTML = res.data[i].user_name + " gierka: " + res.data[i].game_name + " widzowie: " + res.data[i].viewer_count + " " + res.data[i].title
                var dotDiv = document.querySelector("#dot"+res.data[i].user_login)
                dotDiv.classList.remove("offline")
                dotDiv.classList.add("online")
            }
        }
        else if ( res.message === "fail") {
            console.log("fail z popup")
        }
            
        
    })
}
function start() {
    var prom = new Promise( (resolve, reject) => {
        getStreamersFromStorageAndDisplay(resolve)
        console.log("po get streamers data")
        
    })

    prom.then(()=>{
        console.log("przed login")
        return new Promise((resolve, reject)=>{
            login(resolve)
            
        })       
    }).then(() => {
        checkStreams()
    })

    
}
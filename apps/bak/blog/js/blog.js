let clouds = document.getElementsByClassName("clouds");
let profile = document.getElementById("profile");
    
window.addEventListener('scroll', () => {
    let distance = window.scrollY;
    clouds[0].style.top = distance * 0.4 + 'px';
    clouds[1].style.top = distance * 0.4 + 'px';
    profile.style.top = (distance * 0.6 - 200) + 'px';
});

// button on bottom right
var S = document.getElementById('mySidebar');
var a = 0;
function openNav() {
  if(a==0)
  {a++;
    S.style.width = "55px";
  }else{
    a=0;
    S.style.width = "0px";
  }
}
let i = 1;
let dom = document.createElement("span");
dom.append(document.createTextNode('✦'));
dom.classList.add('stars');
while (i<100){
    let doms = dom.cloneNode();
    doms.setAttribute('style', "--i:"+i*10+";");
    document.body.appendChild(doms);
    i++;
}

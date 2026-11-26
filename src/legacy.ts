const home = new URL("./", window.location.href);
home.search = window.location.search;
home.hash = window.location.hash;
window.location.replace(home.href);

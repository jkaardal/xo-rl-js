export let xoLog = console.log;


export function disableLogging() {
    xoLog = function() {};
}


export function enableLogging() {
    xoLog = console.log;
}
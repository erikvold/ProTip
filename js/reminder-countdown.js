function daysTillEndOfWeek(endOfWeek) {
    var now = (new Date).getTime();
    var milliseconds = endOfWeek - now;
    return millisecondsToDays(milliseconds)
}

function millisecondsToDays(milliseconds) {
    var seconds = Math.floor(milliseconds / 1000);
    var minutes = Math.floor(seconds / 60);
    var hours = Math.floor(minutes / 60);
    var days = Math.floor(hours / 24);
    return days;
}

function restartTheWeek() {
    var now = (new Date).getTime();
    var milliSecondsInWeek = 604800000;
    var extraHour = 3600000; // add an hour to help the UI design.

    var alarm = now + milliSecondsInWeek + extraHour;

    var endOfWeek = new Date(alarm);

    var daysRemaining = daysTillEndOfWeek(endOfWeek);

    localStorage['endOfWeek'] = alarm;

    // $('#days-till-end-of-week').html(daysRemaining);
    // $('#days-till-end-of-week').effect("highlight", {
    //     color: 'rgb(100, 189, 99)'
    // }, 1000);
    //
    // $('#date-end-of-week').html(endOfWeek.format("dddd, mmmm dS, yyyy, h:MM:ss TT"));
    // $('#date-end-of-week').effect("highlight", {
    //     color: 'rgb(100, 189, 99)'
    // }, 1000);
    //
    // $('#donate-now-reminder').fadeOut();

    return {endOfWeek: endOfWeek, daysRemaining: daysRemaining}
}


// function restartTheWeek() {
//     var now = (new Date).getTime();
//     var milliSecondsInWeek = 604800000;
//     var extraHour = 3600000; // add an hour to help the UI design.
//
//     var alarm = now + milliSecondsInWeek + extraHour;
//
//     var endOfWeek = new Date(alarm);
//
//     var daysRemaining = daysTillEndOfWeek(endOfWeek);
//
//     localStorage['endOfWeek'] = alarm;
//
//     $('#days-till-end-of-week').html(daysRemaining);
//     $('#days-till-end-of-week').effect("highlight", {
//         color: 'rgb(100, 189, 99)'
//     }, 1000);
//
//     $('#date-end-of-week').html(endOfWeek.format("dddd, mmmm dS, yyyy, h:MM:ss TT"));
//     $('#date-end-of-week').effect("highlight", {
//         color: 'rgb(100, 189, 99)'
//     }, 1000);
//
//     $('#donate-now-reminder').fadeOut();
// }


var someString1 = 'h1200131153725';
var someString2 = 'h1200131153726';
console.log(msgIDToMilli(someString1));
console.log(msgIDToMilli(someString2));

function msgIDToMilli(msgid){
    var timeString = '20'+msgid.substr(2,2)+'-'+msgid.substr(4,2)+
        '-'+msgid.substr(6,2)+'T'+msgid.substr(8,2)+
        ':'+msgid.substr(10,2)+':'+msgid.substr(12,2);
    var timeMilli = Date.parse(timeString);
    return timeMilli;
}
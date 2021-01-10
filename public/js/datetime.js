/* date functions */

const getPickerDate = (date) => {
    date = date.split('/');
    return new Date(`${date[2]}-${date[1]}-${date[0]} 0:0:0`);
}

const getTimeString = (date) => {
    date = new Date(date);
    let hours = date.getHours();
    if (hours > 12) hours -= 12;
    return hours + ':' + date.getMinutes().toString().padStart(2, '0');
}

const getTimeNum = (date) => {
    date = new Date(date);
    return date.getHours() + (date.getMinutes() / 60);
}

const timeNumToDisplay = (num) => {
    let hours = parseInt(num);
    let minutes = (num * 60) - (60 * hours);
    if (hours > 12) return `${hours-12}:${minutes.toFixed().padStart(2, '0')} pm`;
    return `${hours}:${minutes.toFixed().padStart(2, '0')} am`;
}

const displayDate = (date) => {
    date = new Date(date);
    return date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear();
}

const mysqlDate = (date) => {
    date = new Date(date);
    return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
}

const mysqlTime = (date) => {
    date = new Date(date);
    return date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
}

const mysqlDatetime = (date) => {
    date = new Date(date);
    return DB.mysqlDate(date) + ' ' + DB.mysqlTime(date);
}

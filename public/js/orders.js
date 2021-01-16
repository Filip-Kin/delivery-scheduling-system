let loaded = false;

const loadingCalendar = () => {
    document.getElementById('calendar-loader').style.display = 'block';
    document.getElementById('calendar-loader').style.opacity = 1;
    document.getElementById('calendar').style.filter = 'blur(5px) brightness(0.6)';
}

const doneLoadingCalendar = () => {
    document.getElementById('calendar-loader').style.opacity = 0;
    document.getElementById('calendar').style.filter = '';
    setTimeout(() => { document.getElementById('calendar-loader').style.display = 'none' }, 1e3);
}

const renderInvoice = async () => {
    initSelects();
    order.id = 'temp';
    order.truck = 0;
    setDetails();
    initDatepicker(today);

    setStreetView(document.getElementById('streetview'), order.address.join(', '));
    await calcRoute();

    await setCalendarDay(today);
    renderTimeSelect(generatePossibleTimes());
    renderTruckSelect();

    updateDeliveryTime();
    createCalendarListing();

    M.updateTextFields();
    setupCalendar();
    doneLoadingCalendar();
    setTimeout(finishLoading, 1.5e3);
    setTimeout(initSelects, 3e3);
    setTimeout(setupListeners, 3.5e3);
}

const renderOrder = async () => {
    initSelects();
    setDetails();
    initDatepicker(order.leaveTime);
    await setCalendarDay(order.leaveTime);

    if (order.notes) document.getElementById('notes').value = order.notes;
    M.textareaAutoResize(document.getElementById('notes'));

    setStreetView(document.getElementById('streetview'), order.address.join(', '));
    await calcRoute();

    renderTimeSelect(generatePossibleTimes());
    renderTruckSelect();

    M.updateTextFields();
    setupCalendar();
    doneLoadingCalendar();
    setTimeout(finishLoading, 1.5e3);
    setTimeout(initSelects, 3e3);
    setTimeout(setupListeners, 3.5e3);
}

const finishLoading = () => {
    document.getElementById('loader').style.opacity = 0;
    document.getElementById('main').style = '';
    setTimeout(() => { document.getElementById('loader').style.display = 'none' }, 1000);
}

const initSelects = () => {
    let selects = document.querySelectorAll('select');
    M.FormSelect.init(selects, {});
}

const setDetails = () => {
    document.getElementById('invoice').innerText = order.invoice;
    document.getElementById('total').innerText = '$' + order.total;
    document.getElementById('destination').value = order.address.join('\n');
    M.textareaAutoResize(document.getElementById('destination'));

    let out = '';
    for (let item of order.products) {
        out += `<tr>
            <td>${item.code}</td>
            <td>${item.qty}</td>
            <td>${item.rate}</td>
            <td>${item.total}</td>
        </tr>`;
    }

    document.getElementById('products').innerHTML = out;
}

const initDatepicker = (date) => {
    M.Datepicker.init(document.querySelectorAll('.datepicker'), {
        autoClose: true,
        format: 'dd/mm/yyyy',
        defaultDate: date,
        setDefaultDate: true,
        autoClose: true,
        onSelect: datePickerChange
    });
}

const setupListeners = () => {
    document.getElementById('time-options').addEventListener('change', updateDeliveryTime);
    document.getElementById('truck-options').addEventListener('change', updateTruck);
    document.getElementById('delivery-date').addEventListener('change', datePickerChange);
    document.getElementById('destination').addEventListener('keydown', () => {
        document.getElementById('update-destination').style.display = 'block'
    });
    document.getElementById('update-destination').addEventListener('click', async () => {
        order.address = document.getElementById('destination').value.split('\n');
        order.notes = document.getElementById('notes').value;
        await renderOrder();
        document.getElementById('update-destination').style.display = 'none';
    });

    document.getElementById('submit').addEventListener('click', submit);
}

const getInvoice = async (id) => {
    let res = (await fetch(API_ROOT + '/invoice/' + id, {
        method: 'GET',
        headers: {
            id: auth.id,
            password: auth.password
        },
        cache: 'force-cache'
    }).then(res => res.json()));
    if (res.order) order = res.order;
    else throw new Error(res.error);
    order.date = new Date(order.date);
    return order;
}

const getOrder = async (id) => {
    let res = (await fetch(API_ROOT + '/order/' + id, {
        method: 'GET',
        headers: {
            id: auth.id,
            password: auth.password
        }
    }).then(res => res.json()));
    if (res.order) order = res.order;
    else throw new Error(res.error);
    order.returnTime = new Date(order.returnTime);
    order.leaveTime = new Date(order.leaveTime);
    order.date = new Date(order.date);
    return order;
}

const getOrders = async (date = null) => {
    orders = (await fetch(API_ROOT + '/orders/' + (date || ''), {
        method: 'GET',
        headers: {
            id: auth.id,
            password: auth.password
        }
    }).then(res => res.json())).orders;
    for (let order of orders) {
        order.returnTime = new Date(order.returnTime);
        order.leaveTime = new Date(order.leaveTime);
        order.date = new Date(order.date);
    }
    return orders;
}

const setCalendarDay = async (date = new Date()) => {
    loadingCalendar();
    date = new Date(date);
    document.getElementById('calendar-date').innerHTML = displayDate(date);
    await getOrders(mysqlDate(date)).then(orders => renderCalendar(orders));
    doneLoadingCalendar();
}

const setupCalendar = () => {
    document.getElementById('next-day').addEventListener('click', () => {
        today.setDate(today.getDate() + 1);
        setCalendarDay(today);
    });
    document.getElementById('previous-day').addEventListener('click', () => {
        today.setDate(today.getDate() - 1);
        setCalendarDay(today);
    });
}

const renderCalendar = (orders) => {
    let out = '';
    for (let thisorder of orders) {
        out += `<a href="/order/?id=${thisorder.id}">
        <div class="calendar-listing ${(thisorder.truck > 0) ? 'truck-2 ': ''}${(typeof order === 'undefined' || thisorder.id !== order.id) ? 'lime':'red'} accent-3 black-text" 
        id="${thisorder.id}"
        style="top: calc((${getTimeNum(thisorder.leaveTime)} - 7) * 83px + 20px); height: calc(${getTimeNum(thisorder.returnTime) - getTimeNum(thisorder.leaveTime)} * 83px);">
            <div class="calendar-listing-time">${getTimeString(thisorder.leaveTime)} - ${getTimeString(thisorder.returnTime)}</div>
            <div class="calendar-listing-invoice">${thisorder.invoice}</div>
            <div class="calendar-listing-name">${thisorder.name}</div>
            <div class="calendar-listing-address">${thisorder.address[0]}</div>
            <div class="calendar-listing-phone">${thisorder.phone}</div>
        </div>
    </a>\n`
    }
    document.getElementById('calendar-listings').innerHTML = out;
}

const createCalendarListing = () => {
    document.getElementById('calendar-listings').innerHTML += `<div class="calendar-listing ${(order.truck > 0) ? 'truck-2 ': ''} red accent-3 black-text" 
        id="${order.id}"
        style="top: calc((${getTimeNum(order.leaveTime)} - 7) * 83px + 20px); height: calc(${getTimeNum(order.returnTime) - getTimeNum(order.leaveTime)} * 83px);">
            <div class="calendar-listing-time">${getTimeString(order.leaveTime)} - ${getTimeString(order.returnTime)}</div>
            <div class="calendar-listing-invoice">${order.invoice}</div>
            <div class="calendar-listing-name">${order.name}</div>
            <div class="calendar-listing-address">${order.address[0]}</div>
            <div class="calendar-listing-phone">${order.phone}</div>
        </div>
    </a>\n`;
}

const moveCalendarListing = () => {
    let listing = document.getElementById(order.id);
    if (!listing) return;
    listing.style.top = `calc((${getTimeNum(order.leaveTime)} - 7) * 83px + 20px)`;
    listing.style.height = `calc(${getTimeNum(order.returnTime) - getTimeNum(order.leaveTime)} * 83px)`;
    listing.children[0].innerHTML = `${getTimeString(order.leaveTime)} - ${getTimeString(order.returnTime)}`;
}

const renderTimeSelect = (options) => {
    let out = '';
    for (let time of options) {
        out += `<option value="${time}"${(typeof order === 'undefined' || getTimeNum(order.leaveTime) !== time)?'':' selected'}>${timeNumToDisplay(time)}</option>\n`;
    }
    document.getElementById('time-options').innerHTML = out;
    initSelects();
}

const generatePossibleTimes = () => {
    let possibleTimes = [];
    let allocateTime = parseFloat((Math.round(((order.time / 60) * 2.5 + .25) * 4) / 4).toFixed(2));
    let notThisOrderOrders = orders.filter(x => (x.id !== order.id && x.truck === order.truck));
    for (let i = 7; i < 17; i += .25) {
        if (notThisOrderOrders.length < 1) {
            possibleTimes.push(i);
            continue;
        }
        iterateThroughOrdersForTimes(notThisOrderOrders, i, allocateTime, possibleTimes);
    }
    return possibleTimes;
}

const iterateThroughOrdersForTimes = (notThisOrderOrders, i, allocateTime, possibleTimes) => {
    for (let thisorder of notThisOrderOrders) {
        let leaveTime = getTimeNum(thisorder.leaveTime);
        let returnTime = getTimeNum(thisorder.returnTime);
        if (leaveTime <= i && returnTime >= i) return; // starts during another order
        if (leaveTime <= i + allocateTime && returnTime >= i + allocateTime) return; // ends during another order
        if (leaveTime >= i && returnTime <= i + allocateTime) return; // another order starts and ends within this time
    }
    possibleTimes.push(i);
}

const renderTruckSelect = () => {
    document.getElementById('truck-options').innerHTML = `<option value="0"${(typeof order === 'undefined' || order.truck !== 0)?'':' selected'}>Truck 1</option>
    <option value="1"${(typeof order === 'undefined' || order.truck !== 1)?'':' selected'}>Truck 2</option>`;
}

const updateDeliveryDate = async () => {
    if (!loaded) {
        loaded = true;
        return;
    }
    order.leaveTime = getPickerDate(document.getElementById('delivery-date').value);
    await setCalendarDay(order.leaveTime);
}

const datePickerChange = async () => {
    await updateDeliveryDate();
    renderTimeSelect(generatePossibleTimes());
    updateDeliveryTime();
    createCalendarListing();
}

const updateDeliveryTime = () => {
    order.leaveTime = getPickerDate(document.getElementById('delivery-date').value);

    let time = parseFloat(document.getElementById('time-options').value);

    order.leaveTime.setHours(parseInt(time));
    order.leaveTime.setMinutes((time * 60) - (parseInt(time) * 60));

    let allocateTime = parseFloat((Math.round(((order.time / 60) * 2.5 + .25) * 4) / 4).toFixed(2));
    order.returnTime = new Date(order.leaveTime);
    order.returnTime.setHours(order.leaveTime.getHours() + parseInt(allocateTime));
    order.returnTime.setMinutes(order.leaveTime.getMinutes() + ((allocateTime - parseInt(allocateTime)) * 60));

    moveCalendarListing();
};

const updateTruck = async () => {
    order.truck = parseInt(document.getElementById('truck-options').value);
    await updateDeliveryDate();
    renderTimeSelect(generatePossibleTimes());
    updateDeliveryTime();
    createCalendarListing();
}

const submit = async () => {
    order.notes = document.getElementById('notes').value;
    fetch(API_ROOT + '/order/' + ((order.id === 'temp') ? '' : order.id), {
        method: 'POST',
        headers: {
            id: auth.id,
            password: auth.password,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(order)
    }).then(res => res.json()).then(json => {
        if (json.error) M.toast({
            html: json.error
        });
        else window.location.href = '/order/?id=' + json.order.id;
    });
}
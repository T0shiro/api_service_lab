'use strict';
const util = require('util');
let methods = {
        createOrder: function (message, db, producer) {
            message.events = [{event: "creation", time: message.timestamp}];
            db.collection('orders').insertOne(message, function (err, r) {
                if (err) {
                    console.log(util.inspect(err));
                } else {
                    let messageResult = JSON.stringify({
                        orderId: r["insertedId"],
                        requestId: message.requestId
                    });

                    producer.send({
                        topic: "create_order",
                        messages: [{key: "", value: messageResult}]
                    });
                }
            });
        },
        submitOrder: function (message, dbHelper, producer) {
            dbHelper.addEvent(message.order.id, {
                event: "submit",
                time: message.timestamp,
            });

        },
        processPaymentResult: function (succeed, message, dbHelper) {
            dbHelper.addEvent(message.order.id, {
                event: "payment",
                time: Math.round(new Date().getTime() / 1000),
                succeed: succeed
            });
            if(succeed){
                dbHelper.db.collection('orders')
                    .find({"_id": msg.order.id})
                    .project({ events: 0})
                    .toArray((err, res) => {
                        console.log("Send msg: " + JSON.stringify(res));
                        res.id = res._id;
                        producer.send({
                            topic: "finalise_order",
                            messages: [{key: "", value: JSON.stringify(res)}]
                        });
                    });
            }else{
                //TODO: manage payment error
            }


        },
        logDeliveyAssignation: function (msg, dbHelper) {
            dbHelper.addEvent(msg.orderId, {event: "coursier_select", time: msg.timestamp, coursier: msg.coursierId})
        },
        logMealCooked: function (msg, dbHelper) {
            dbHelper.addEvent(msg.order.id, {event: "cooked", time: msg.time_stamp});
        },
        validateFinishOrder: function (msg, dbHelper) {
            console.log("Id = " + msg.order.id);
            dbHelper.addEvent(msg.order.id, {event: "delivered", time: msg.time_stamp});
            dbHelper.db.collection('orders')
                .find({"_id": msg.order.id})
                .forEach((err, res) => {
                    console.log(res);
                        if (err) {
                            console.log(err);
                        }
                        else {
                            console.log(res);
                        }
                });
        }
    }
;

module.exports = methods;
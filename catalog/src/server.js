'use strict';

const util = require('util');
let http = require('http');
let url = require('url');
let methods = require('./methods');
const {Kafka, logLevel} = require('kafkajs');
let mongoHelper = require("./mongo-helper");

mongoHelper.initialize(mongoHelper, (db) => {
    if(mongoHelper.db.collection("meals").count() === 0) {
        // Seed the database
        console.log("Seeding database");
        mongoHelper.db.collection("meals").insert(
                [
                    {
                        id: "42",
                        name: "Mac first",
                        category: "burger",
                        eta: 4,
                        price: 1.0,
                        feedback: [
                            {
                                rating: 4,
                                customerId: "15",
                                desc: "Awesome"

                            }
                        ],
                        restaurant: {
                            id: "12",
                            name: "MacDo",
                            address: "4 Privet Drive"
                        }
                    },
                    {
                        id: "51",
                        name: "Big Mac",
                        category: "burger",
                        eta: 4,
                        price: 1.0,
                        feedback: [
                            {
                                rating: 4,
                                customerId: "15",
                                desc: "Awesome"

                            }
                        ],
                        restaurant: {
                            id: "12",
                            name: "MacDo",
                            address: "4 Privet Drive"
                        }
                    },
                    {
                        id: "69",
                        name: "Whopper",
                        category: "burger",
                        eta: 4,
                        price: 1.0,
                        feedback: [],
                        restaurant: {
                            id: "25",
                            name: "BurgerKing",
                            address: "7 Privet Drive"
                        }
                    }
                ]
        )
    }
});


const kafka = new Kafka({
    logLevel: logLevel.INFO,
    brokers: ["kafka:9092"],
    connectionTimeout: 3000,
    clientId: 'catalog',
});
const listMeals = kafka.consumer({groupId: 'list_meals'});
const addFeedback = kafka.consumer({groupId: 'add_feedback'});
const listFeedback = kafka.consumer({groupId: 'list_feedback'});
const producer = kafka.producer();

const run = async () => {
    await producer.connect();

    await listMeals.connect();
    await listMeals.subscribe({topic: "finalise_order"});
    await listMeals.run({
        eachMessage: async ({topic, partition, message}) => {
            methods.listMeals(message.value.toString(), producer, mongoHelper.db);
        }
    });

    await addFeedback.connect();
    await addFeedback.subscribe({topic: "add_feedback"});
    await addFeedback.run({
        eachMessage: async ({topic, partition, message}) => {
            methods.addFeedback(message.value.toString(), producer, mongoHelper.db);
        }
    });

    await listFeedback.connect();
    await listFeedback.subscribe({topic: "list_feedback"});
    await listFeedback.run({
        eachMessage: async ({topic, partition, message}) => {
            methods.listFeedback(message.value.toString(), producer, mongoHelper.db);
        }
    });

};

run().catch(e => console.error(`[example/consumer] ${e.message}`, e));

const errorTypes = ['unhandledRejection', 'uncaughtException'];
const signalTraps = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

errorTypes.map(type => {
    process.on(type, async e => {
        try {
            console.log(`process.on ${type}`);
            console.error(e);
            await getDeliverableOrders.disconnect();
            process.exit(0)
        } catch (_) {
            process.exit(1)
        }
    })
});

signalTraps.map(type => {
    process.once(type, async () => {
        try {
            await getDeliverableOrders.disconnect();
            await producer.disconnect();
        } finally {
            process.kill(process.pid, type)
        }
    })
});
#!/usr/bin/env node

import fetch from "node-fetch";
import * as https from "https";
import { webcrypto } from "node:crypto";
import { bluetooth } from "webbluetooth";
import { WebSocket, WebSocketServer } from "ws";
import commandLineArgs from "command-line-args";
import commandLineUsage from "command-line-usage";
import {
    Client, Types, Protobuf,
} from "@meshtastic/js";

// FIXME: meshtastic.js requires crypto and navigator.bluetooth, but they don't exist in nodejs, so we will supply them
globalThis.crypto = webcrypto;
globalThis.navigator = {
    bluetooth: bluetooth,
};

// FIXME: replacing global fetch, so we can use an https agent to ignore self-signed ssl certs used in meshtastic linux native devices
globalThis.fetch = async (url, options) => {
    return fetch(url, {
        ...options,
        agent: new https.Agent({
            rejectUnauthorized: false,
        }),
    });
};

// FIXME: ignoring uncaught exception, caused by "Packet x of type packet timed out"...
process.on("uncaughtException", (e) => {
    console.error("Ignoring uncaught exception", e);
});

// remember when we started
const startupSeconds = Date.now() / 1000;

const optionsList = [
    {
        name: 'help',
        alias: 'h',
        type: Boolean,
        description: 'Display this usage guide.'
    },
    {
        name: "meshtastic-host",
        type: String,
        description: "IP address of Meshtastic device (default: 127.0.0.1)",
    },
    {
        name: "meshtastic-tls",
        type: String,
        description: "Use TLS when connecting to Meshtastic device (default: true)",
    },
    {
        name: "websocket-port",
        type: Number,
        description: "Port to run Websocket Server on (default: 8080)",
    },
    {
        name: "ignore-history",
        type: String,
        description: "When enabled, does not send packets to websocket clients if rxTime is before we connected to the device (default: true)",
    },
];

// parse command line args
const options = commandLineArgs(optionsList);

// show help
if(options.help){
    const usage = commandLineUsage([
        {
            header: 'Meshtastic Websocket Proxy',
            content: 'Proxies ToRadio and FromRadio packets between a single Meshtastic device and multiple WebSocket clients.',
        },
        {
            header: 'Options',
            optionList: optionsList,
        },
    ]);
    console.log(usage);
    process.exit(0);
}

// use provided config, or fallback to defaults
const config = {
    "meshtastic_host": options["meshtastic-host"] ?? "127.0.0.1",
    "meshtastic_tls": options["meshtastic-tls"] ? options["meshtastic-tls"] === "true" : true,
    "websocket_port": options["websocket-port"] ?? "8080",
    "meshtastic_ignore_history": options["ignore-history"] ? options["ignore-history"] === "true" : true,
};

// create websocket server
const wss = new WebSocketServer({
    port: config.websocket_port,
});

// create meshtastic http client
const client = new Client();
const connection = client.createHttpConnection();

// exit when meshtastic client disconnects or tries to reconnect, as events don't seem to come through after reconnect
connection.events.onDeviceStatus.subscribe((status) => {
    if(status === Types.DeviceStatusEnum.DeviceDisconnected || status === Types.DeviceStatusEnum.DeviceReconnecting){
        console.log("Exiting, as disconnect/reconnect doesn't seem to work properly...");
        process.exit(1);
    }
});

// handle new websocket connections
wss.on('connection', (ws) => {

    // handle received messages
    ws.on('message', (message) => {
        try {

            // parse received message as json
            const data = JSON.parse(message);

            // handle ToRadio packets received from websocket clients
            if(data.type === "to_radio"){
                if(data.protobuf){
                    // send ToRadio packet as raw protobuf to meshtasticd
                    connection.sendRaw(Buffer.from(data.protobuf, "base64"));
                } else if(data.json) {
                    // send ToRadio packet created from json to meshtasticd
                    connection.sendRaw(Protobuf.Mesh.ToRadio.fromJson(data.json).toBinary());
                }
            }

        } catch(e) {
            console.error("failed to parse websocket message", e);
        }
    });

});

// listen for FromRadio packets from meshtastic device
connection.events.onFromRadio.subscribe((fromRadio) => {

    // if enabled, ignore packets received by the radio before we started this script
    if(config.meshtastic_ignore_history){
        const fromRadioJson = fromRadio.toJson();
        const rxTimeSeconds = fromRadioJson.packet?.rxTime;
        if(rxTimeSeconds < startupSeconds){
            const packetAge = Math.round(startupSeconds - rxTimeSeconds);
            console.log(`Ignoring packet that is ${packetAge} seconds old...`);
            return;
        }
    }

    // forward fromRadio packets to all connected websocket clients
    wss.clients.forEach((client) => {
        if(client.readyState === WebSocket.OPEN){
            client.send(JSON.stringify({
                type: "from_radio",
                // send raw protobuf as base64 to allow other clients to process any fields unknown to us
                protobuf: Buffer.from(fromRadio.toBinary()).toString("base64"),
                // send json version of protobuf to allow clients to easily use fields known to us without having to parse protobuf
                json: fromRadio.toJson(),
            }));
        }
    });

});

// connect to meshtastic device
await connection.connect({
    address: config.meshtastic_host,
    tls: config.meshtastic_tls,
});

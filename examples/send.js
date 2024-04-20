import { WebSocket } from "ws";
import { Constants, Protobuf } from "@meshtastic/js";

// connect to meshtastic-websocket-proxy
const ws = new WebSocket("ws://127.0.0.1:8080");

// send a text message to default channel
ws.onopen = () => {

    // create ToRadio message
    const toRadio = new Protobuf.Mesh.ToRadio({
        payloadVariant: {
            case: "packet",
            value: new Protobuf.Mesh.MeshPacket({
                to: Constants.broadcastNum,
                payloadVariant: {
                    case: "decoded",
                    value: {
                        portnum: Protobuf.Portnums.PortNum.TEXT_MESSAGE_APP,
                        payload: Buffer.from("Hello from NodeJS!"),
                    },
                },
            }),
        },
    });

    // convert protobuf to base64
    const protobuf = Buffer.from(toRadio.toBinary()).toString("base64");

    console.log({
        protobuf: protobuf,
        to_radio: toRadio,
    });

    // send packet to radio via websocket
    ws.send(JSON.stringify({
        "type": "to_radio",
        "protobuf": protobuf,
    }));

};

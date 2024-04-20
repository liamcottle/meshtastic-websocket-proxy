import { WebSocket } from "ws";
import { Constants, Protobuf } from "@meshtastic/js";

// connect to meshtastic-websocket-proxy
const ws = new WebSocket("ws://127.0.0.1:8080");

// log all received FromRadio packets
ws.onmessage = (message) => {
    try {
        const data = message.data;
        const json = JSON.parse(data);
        if(json.type === "from_radio"){
            const protobuf = Buffer.from(json.protobuf, "base64");
            const fromRadio = Protobuf.Mesh.FromRadio.fromBinary(protobuf);
            console.log({
                protobuf: json.protobuf,
                from_radio: fromRadio,
            });
        }
    } catch(e) {
        console.error(e);
    }
};

// send a text message to default channel with a ToRadio packet
ws.onopen = () => {

    // create ToRadio message
    const toRadio = new Protobuf.Mesh.ToRadio({
        payloadVariant: {
            case: "packet",
            value: new Protobuf.Mesh.MeshPacket({
                to: Constants.broadcastNum,
                wantAck: true,
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

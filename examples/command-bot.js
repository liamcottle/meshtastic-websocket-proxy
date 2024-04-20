import { WebSocket } from "ws";
import { Protobuf } from "@meshtastic/js";

// TODO: set your numeric node id here, so we can ignore messages not sent to us
// FIXME: dynamically get this from the radio over websocket?
const myNodeId = 3944424993;

// connect to meshtastic-websocket-proxy
const ws = new WebSocket("ws://127.0.0.1:8080");

// listen for received FromRadio packets
ws.onmessage = (message) => {
    try {
        const data = message.data;
        const json = JSON.parse(data);
        if(json.type === "from_radio"){

            // decode FromRadio protobuf
            const protobuf = Buffer.from(json.protobuf, "base64");
            const fromRadio = Protobuf.Mesh.FromRadio.fromBinary(protobuf);

            // handle mesh packet
            if(fromRadio.payloadVariant.case === "packet"){
                onMeshPacket(fromRadio.payloadVariant.value);
            }

        }
    } catch(e) {
        console.error(e);
    }
};

function onMeshPacket(meshPacket) {

    // ignore packets not sent directly to us
    if(meshPacket.to !== myNodeId){
        return;
    }

    // handle decoded
    if(meshPacket.payloadVariant.case === "decoded"){

        const decoded = meshPacket.payloadVariant.value;
        const portnum = decoded.portnum;

        // handle text messages
        if(portnum === Protobuf.Portnums.PortNum.TEXT_MESSAGE_APP){

            // reply to "ping" with "pong"
            const text = decoded.payload.toString();
            if(text.toLowerCase() === "ping"){
                sendDirectMessage(meshPacket.from, "pong");
            }

        }

    }

}

function sendDirectMessage(to, message) {

    // create ToRadio message
    const toRadio = new Protobuf.Mesh.ToRadio({
        payloadVariant: {
            case: "packet",
            value: new Protobuf.Mesh.MeshPacket({
                to: to,
                payloadVariant: {
                    case: "decoded",
                    value: {
                        portnum: Protobuf.Portnums.PortNum.TEXT_MESSAGE_APP,
                        payload: Buffer.from(message),
                    },
                },
            }),
        },
    });

    // convert protobuf to base64
    const protobuf = Buffer.from(toRadio.toBinary()).toString("base64");

    // send packet to radio via websocket
    ws.send(JSON.stringify({
        "type": "to_radio",
        "protobuf": protobuf,
    }));

}

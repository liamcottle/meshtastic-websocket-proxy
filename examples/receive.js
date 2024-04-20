import { WebSocket } from "ws";
import { Protobuf } from "@meshtastic/js";

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

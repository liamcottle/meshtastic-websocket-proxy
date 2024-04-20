# Meshtastic Websocket Proxy

Proxies [ToRadio](https://buf.build/meshtastic/protobufs/docs/main:meshtastic#meshtastic.ToRadio) and [FromRadio](https://buf.build/meshtastic/protobufs/docs/main:meshtastic#meshtastic.FromRadio) packets between a single Meshtastic device and multiple websocket clients.

The `/api/v1/fromradio` endpoint of the [Meshtastic HTTP API](https://meshtastic.org/docs/development/device/http-api/) only supports one client connection at a time. If you have more than one client fetching the `fromradio` endpoint, one of the clients will "consume" those packets from the device, and they will not be received by the other clients.

This is an issue if you want to have several different applications listening to packets from a single Meshtastic device. To combat this, this project expects to be the only client connecting to your Meshtastic device. It runs a simple websocket server, which will forward all `FromRadio` packets received from the device to all clients connected to the websocket.

You will be able to connect multiple clients to the websocket, and all connected clients will receive the same packets. The websocket also allows multiple clients to send packets to the radio at the same time.

## How to run it?

```
node src/index.js --help
```

```
Meshtastic Websocket Proxy

  Proxies ToRadio and FromRadio packets between a single Meshtastic device and multiple WebSocket clients.                                                   

Options

  -h, --help                 Display this usage guide.
  --meshtastic-host string   IP address of Meshtastic device (default: 127.0.0.1)
  --meshtastic-tls string    Use TLS when connecting to Meshtastic device (default: true)
  --websocket-port number    Port to run Websocket Server on (default: 8080)
  --ignore-history string    When enabled, does not send packets to websocket clients if rxTime is before we connected to the device (default: true)
```

To proxy Meshtastic Linux Native over a websocket on port 8080, you could do something like the following;

```
node src/index.js --meshtastic-host 127.0.0.1 --websocket-port 8080
```

Alternatively, you can run the latest version directly from npm without downloading the source.

```
npx @liamcottle/meshtastic-websocket-proxy --meshtastic-host 127.0.0.1 --websocket-port 8080
```

## How to use the websocket?

The websocket sends and receives json payloads, containing base64 encoded protobuf.

For example, when your Meshtastic device receives a `TEXT_MESSAGE_APP` packet, it will send the following payload to all connected websocket clients;

```
{
   "type": "from_radio",
   "protobuf": "EjsNwHJFchUhJhvrIg8IARILSGVsbG8gTWVzaCE1JYEXZz0EkCNmRQAAwEBIBVABYO3//////////wF4BQ==",
   "json": {
      "packet": {
         "from": 1917153984,
         "to": 3944424993,
         "decoded": {
            "portnum": "TEXT_MESSAGE_APP",
            "payload": "SGVsbG8gTWVzaCE="
         },
         "id": 1729593637,
         "rxTime": 1713606660,
         "rxSnr": 6,
         "hopLimit": 5,
         "wantAck": true,
         "rxRssi": -19,
         "hopStart": 5
      }
   }
}
```

- `protobuf` contains the raw `FromRadio` packet encoded as base64.
- `json` contains a decoded version of the protobuf for ease of use.

You can also send packets to the websocket that will be sent to the radio. This will require you to correctly encode the protobuf and then send it as base64.

For example, to send a text message to the default channel with the text `Hello from NodeJS!`, you would send the following to the websocket;

```
{
  "type": "to_radio",
  "protobuf": "Ch0V/////yIWCAESEkhlbGxvIGZyb20gTm9kZUpTIQ=="
}
```

> NOTE: If you are unsure on how to encode the protobuf, see the [send.js](./examples/send.js) example script.

## TODO

- Support proxying BLE and Serial connections.
  - This already works, I just haven't exposed that connection method via config yet...

## License

MIT

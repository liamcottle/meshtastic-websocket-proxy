# Meshtastic Websocket Proxy

Proxies [ToRadio](https://github.com/meshtastic/protobufs/blob/master/meshtastic/mesh.proto#L1426) and [FromRadio](https://github.com/meshtastic/protobufs/blob/master/meshtastic/mesh.proto#L1336) packets between a single Meshtastic device and multiple websocket clients.

The `/api/v1/fromradio` endpoint of the [Meshtastic HTTP API](https://meshtastic.org/docs/development/device/http-api/) only supports one client connection at a time. If you have more than one client fetching the `fromradio` endpoint, one of the clients will "consume" those packets from the device, and they will not be received by the other clients.

This project expects to be the only client connecting to your Meshtastic device. It runs a simple websocket server, which will forward all `FromRadio` packets received from the device to all clients connected to the websocket.

You will be able to connect multiple clients to the websocket, as all connected clients will receive the same packets. The websocket also allows multiple clients to send packets to the radio at the same time.

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

## TODO

- Add docs for sending/receiving packets over the websocket
- Support proxying BLE and Serial connections.

## License

MIT

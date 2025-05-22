// TextSendSocketMethod.js
function TextSendSocketMethod(config) {
    var socket = null;
    var msgHandle = config.msgHandle || function () {};
    var stateHandle = config.stateHandle || function () {};
    var uri = config.uri || "ws://localhost:1145";  // 默认地址

    // 建立连接
    this.wsStart = function () {
        if (socket && socket.readyState === 1) {
            return;
        }

        socket = new WebSocket(uri);

        socket.onopen = function (e) {
            console.log("✅ 文本发送 WebSocket 已连接");
            stateHandle(0);
        };

        socket.onmessage = function (e) {
            console.log("📨 接收到服务器返回：", e.data);
            msgHandle(e);
        };

        socket.onerror = function (e) {
            console.error("❌ WebSocket 错误：", e);
            stateHandle(2);
        };

        socket.onclose = function (e) {
            console.log("❌ 文本发送 WebSocket 已关闭");
            stateHandle(1);
        };
    };

    // 主动关闭连接
    this.wsStop = function () {
        if (socket && socket.readyState === 1) {
            socket.close();
        }
    };

    // 发送文本
    this.wsSend = function (text) {
        if (socket && socket.readyState === 1) {
            const payload = typeof text === "string" ? text : JSON.stringify(text);
            socket.send(payload);
            console.log("📤 已发送内容：", payload);
        } else {
            console.warn("⚠️ WebSocket 尚未连接，无法发送");
        }
    };

    // 返回连接状态
    this.isReady = function () {
        return socket && socket.readyState === 1;
    };
}
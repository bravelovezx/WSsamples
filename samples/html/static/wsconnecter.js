/**
 * Copyright FunASR (https://github.com/alibaba-damo-academy/FunASR). All Rights
 * Reserved. MIT License  (https://opensource.org/licenses/MIT)
 */
/* 2021-2023 by zhaoming,mali aihealthx.com */


//这是一个构造函数，接收一个配置对象 config，其中必须包含两个回调函数：
//config.msgHandle：接收识别结果
//config.stateHandle：处理连接状态更新（如已连接、断开、异常）
function WebSocketConnectMethod( config ) { //定义socket连接方法类

	
	var speechSokt; //// WebSocket 对象
	var connKeeperID; // 可选的连接保活定时器 ID（这里没用到）
	
	var msgHandle = config.msgHandle;
	var stateHandle = config.stateHandle;
	
	//建立 WebSocket 连接
	this.wsStart = function () {
		var Uri = document.getElementById('wssip').value; //"wss://111.205.137.58:5821/wss/" //设置wss asr online接口地址 如 wss://X.X.X.X:port/wss/
		if(Uri.match(/wss:\S*|ws:\S*/))
		{
			console.log("Uri"+Uri);
		}
		else
		{
			alert("请检查wss地址正确性");
			return 0;
		}
 
		if ( 'WebSocket' in window ) {
			speechSokt = new WebSocket( Uri ); // 定义socket连接对象
			speechSokt.onopen = function(e){onOpen(e);}; // 定义响应函数
			speechSokt.onclose = function(e){
			    console.log("onclose ws!");
			    //speechSokt.close();
				onClose(e);
				};
			speechSokt.onmessage = function(e){onMessage(e);};
			speechSokt.onerror = function(e){onError(e);};
			return 1;
		}
		else {
			alert('当前浏览器不支持 WebSocket');
			return 0;
		}
	};
	
	// 定义停止与发送函数
	this.wsStop = function () {
		if(speechSokt != undefined) {
			console.log("stop ws!");
			speechSokt.close();
		}
	};
	
	//发送音频数据
	this.wsSend = function ( oneData ) {
 
		if(speechSokt == undefined) return;
		if ( speechSokt.readyState === 1 ) { // 0:CONNECTING, 1:OPEN, 2:CLOSING, 3:CLOSED
 
			speechSokt.send( oneData );
 
			
		}
	};
	
	// SOCEKT连接中的消息与状态响应
	function onOpen( e ) {
		// 发送json
		var chunk_size = new Array( 5, 10, 5 );
		var request = {
			"chunk_size": chunk_size,
			"wav_name":  "h5",
			"is_speaking":  true,
			"chunk_interval":10,
			"itn":getUseITN(),  // 是否使用标准文本格式化
			"mode":getAsrMode(), //// 当前ASR识别模式
			
		};
		if(isfilemode)
		{
			request.wav_format=file_ext;
			if(file_ext=="wav")
			{
				request.wav_format="PCM";
				request.audio_fs=file_sample_rate;
			}
		}
		
		var hotwords=getHotwords();
 
		if(hotwords!=null  )
		{
			request.hotwords=hotwords;
		}
		console.log(JSON.stringify(request));
		speechSokt.send(JSON.stringify(request));
		console.log("连接成功");
		stateHandle(0);
 
	}
	
	function onClose( e ) {
		stateHandle(1);
	}
	
	function onMessage( e ) {
 
		msgHandle( e );
	}
	
	function onError( e ) {
 
		info_div.innerHTML="连接"+e;
		console.log(e);
		stateHandle(2);
		
	}
    
 
}
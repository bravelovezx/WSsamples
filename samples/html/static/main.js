/**
 * Copyright FunASR (https://github.com/alibaba-damo-academy/FunASR). All Rights
 * Reserved. MIT License  (https://opensource.org/licenses/MIT)
 */
/* 2022-2023 by zhaoming,mali aihealthx.com */




// 连接; 定义socket连接类对象与语音对象
var wsconnecter = new WebSocketConnectMethod({
    msgHandle: getJsonMessage,  // ✅ 主界面使用的识别函数
    stateHandle: getConnState,
    localUrl: "ws://127.0.0.1:8088" // ✅ 将远端消息转发给这个端口
});

// var junjieconnecter = new WebSocketConnectMethod({
// 	msgHandle: getJsonMessage,
//     stateHandle: getConnState,
//     customUri: "ws://127.0.0.1:1145"  // ✅ 你要连接的目标地址
// })

var audioBlob;

// 录音; 定义录音对象,wav格式
var rec = Recorder({
	type:"pcm",
	bitRate:16,
	sampleRate:16000,
	onProcess:recProcess
});



 
 
 
var sampleBuf=new Int16Array();
// 定义按钮响应事件
var btnStart = document.getElementById('btnStart');
btnStart.onclick = record;
var btnStop = document.getElementById('btnStop');
btnStop.onclick = stop;
btnStop.disabled = true;
btnStart.disabled = true;
 
btnConnect= document.getElementById('btnConnect');
btnConnect.onclick = start;

//新增发送按钮
var btnSendText = document.getElementById('btnSendText');
btnSendText.onclick = sendRecognizedText;

var awsslink= document.getElementById('wsslink');

 
var rec_text="";  // for online rec asr result
var rec_text2="";
var offline_text=""; // for offline rec asr result
var offline_text2=""
var info_div = document.getElementById('info_div');

var upfile = document.getElementById('upfile');

 

var isfilemode=false;  // if it is in file mode
var file_ext="";
var file_sample_rate=16000; //for wav file sample rate
var file_data_array;  // array to save file data
 
var totalsend=0;


var now_ipaddress=window.location.href;
now_ipaddress=now_ipaddress.replace("https://","wss://");
now_ipaddress=now_ipaddress.replace("static/index.html","");
var localport=window.location.port;
now_ipaddress=now_ipaddress.replace(localport,"10095");
document.getElementById('wssip').value=now_ipaddress;
addresschange();
function addresschange()
{   
	
    var Uri = document.getElementById('wssip').value; 
	document.getElementById('info_wslink').innerHTML="点此处手工授权（IOS手机）";
	Uri=Uri.replace(/wss/g,"https");
	console.log("addresschange uri=",Uri);
	
	awsslink.onclick=function(){
		window.open(Uri, '_blank');
		}
	
}

upfile.onclick=function()
{
		btnStart.disabled = true;
		btnStop.disabled = true;
		btnConnect.disabled=false;
	
}

// from https://github.com/xiangyuecn/Recorder/tree/master

	
var readWavInfo=function(bytes){
	//读取wav文件头，统一成44字节的头
	if(bytes.byteLength<44){
		return null;
	};
	var wavView=bytes;
	var eq=function(p,s){
		for(var i=0;i<s.length;i++){
			if(wavView[p+i]!=s.charCodeAt(i)){
				return false;
			};
		};
		return true;
	};
	
	if(eq(0,"RIFF")&&eq(8,"WAVEfmt ")){
 
		var numCh=wavView[22];
		if(wavView[20]==1 && (numCh==1||numCh==2)){//raw pcm 单或双声道
			var sampleRate=wavView[24]+(wavView[25]<<8)+(wavView[26]<<16)+(wavView[27]<<24);
			var bitRate=wavView[34]+(wavView[35]<<8);
			var heads=[wavView.subarray(0,12)],headSize=12;//head只保留必要的块
			//搜索data块的位置
			var dataPos=0; // 44 或有更多块
			for(var i=12,iL=wavView.length-8;i<iL;){
				if(wavView[i]==100&&wavView[i+1]==97&&wavView[i+2]==116&&wavView[i+3]==97){//eq(i,"data")
					heads.push(wavView.subarray(i,i+8));
					headSize+=8;
					dataPos=i+8;break;
				}
				var i0=i;
				i+=4;
				i+=4+wavView[i]+(wavView[i+1]<<8)+(wavView[i+2]<<16)+(wavView[i+3]<<24);
				if(i0==12){//fmt 
					heads.push(wavView.subarray(i0,i));
					headSize+=i-i0;
				}
			}
			if(dataPos){
				var wavHead=new Uint8Array(headSize);
				for(var i=0,n=0;i<heads.length;i++){
					wavHead.set(heads[i],n);n+=heads[i].length;
				}
				return {
					sampleRate:sampleRate
					,bitRate:bitRate
					,numChannels:numCh
					,wavHead44:wavHead
					,dataPos:dataPos
				};
			};
		};
	};
	return null;
};

////这是用户选择音频文件后自动触发的处理函数。
upfile.onchange = function () {
　　　　　　var len = this.files.length;   //获取上传的文件数量（支持多文件上传，通常只处理第一个）
            for(let i = 0; i < len; i++) {
				
				//第一次读取：获取二进制音频数据
                let fileAudio = new FileReader();  
                fileAudio.readAsArrayBuffer(this.files[i]);  
				//解析出文件扩展名（如 .wav、.mp3），赋值给 file_ext。
				file_ext=this.files[i].name.split('.').pop().toLowerCase();
                var audioblob;

				//将读取到的原始音频数据赋值给全局变量 file_data_array
				//显示提示文本，引导用户连接识别服务器
                fileAudio.onload = function() {
                audioblob = fileAudio.result;
 
				 
				file_data_array=audioblob;
 
                  
                 info_div.innerHTML='请点击连接进行识别';
 
                }

　　　　　　　　　　fileAudio.onerror = function(e) {
　　　　　　　　　　　　console.log('error' + e);
　　　　　　　　　　}
            }
			// for wav file, we  get the sample rate
			if(file_ext=="wav")
            for(let i = 0; i < len; i++) {

                let fileAudio = new FileReader();
                fileAudio.readAsArrayBuffer(this.files[i]);  
                fileAudio.onload = function() {
                audioblob = new Uint8Array(fileAudio.result);
 
				// for wav file, we can get the sample rate
				var info=readWavInfo(audioblob);
				   console.log(info);
				   file_sample_rate=info.sampleRate;
	 
 
                }

　　　　　　 
            }
 
        }

//试听上传文件
function play_file()
{
		  var audioblob=new Blob( [ new Uint8Array(file_data_array)] , {type :"audio/wav"});
		  var audio_record = document.getElementById('audio_record');
		  audio_record.src =  (window.URL||webkitURL).createObjectURL(audioblob); 
          audio_record.controls=true;
		  //audio_record.play();  //not auto play
}

//将上传的音频文件按块发送给识别服务
function start_file_send()
{
		sampleBuf=new Uint8Array( file_data_array );  //将整段音频数据加载为一个 Uint8Array 缓存，用于 chunk 切分。
 
		var chunk_size=960; // for asr chunk_size [5, 10, 5]  设置单个发送块大小（与麦克风流识别一致，通常代表 60ms 音频块）
 

 
		
		while(sampleBuf.length>=chunk_size){
			
		    sendBuf=sampleBuf.slice(0,chunk_size);  //从 sampleBuf 中提取 前 chunk_size 个元素作为一帧音频数据 sendBuf
			totalsend=totalsend+sampleBuf.length;
			sampleBuf=sampleBuf.slice(chunk_size,sampleBuf.length);  // sampleBuf剩下的 
			wsconnecter.wsSend(sendBuf);
 
		}
 
		stop();

 

}
 
//切换录音输入源（麦克风 / 文件）
function on_recoder_mode_change()
{
            var item = null;
            var obj = document.getElementsByName("recoder_mode");
            for (var i = 0; i < obj.length; i++) { //遍历Radio 
                if (obj[i].checked) {
                    item = obj[i].value;  
					break;
                }
		    

           }
		    if(item=="mic")
			{
				document.getElementById("mic_mode_div").style.display = 'block';
				document.getElementById("rec_mode_div").style.display = 'none';
 
 
		        btnStart.disabled = true;
		        btnStop.disabled = true;
		        btnConnect.disabled=false;
				isfilemode=false;
			}
			else
			{
				document.getElementById("mic_mode_div").style.display = 'none';
				document.getElementById("rec_mode_div").style.display = 'block';
 
		        btnStart.disabled = true;
		        btnStop.disabled = true;
		        btnConnect.disabled=true;
			    isfilemode=true;
				info_div.innerHTML='请点击选择文件';
			    
	 
			}
}

// 提取用户自定义的热词及其权重
function getHotwords(){
	
	var obj = document.getElementById("varHot");  //获取热词输入框 DOM 对象。

	if(typeof(obj) == 'undefined' || obj==null || obj.value.length<=0){
	  return null;  //如果没有输入热词，则返回 null。
	}
	let val = obj.value.toString();
  
	console.log("hotwords="+val);
	let items = val.split(/[(\r\n)\r\n]+/);  //split by \r\n
	var jsonresult = {};
	const regexNum = /^[0-9]*$/; // test number
	for (item of items) {
  
		let result = item.split(" ");
		if(result.length>=2 && regexNum.test(result[result.length-1]))
		{ 
			var wordstr="";
			for(var i=0;i<result.length-1;i++)
				wordstr=wordstr+result[i]+" ";
  
			jsonresult[wordstr.trim()]= parseInt(result[result.length-1]);
		}
	}
	console.log("jsonresult="+JSON.stringify(jsonresult));
	return  JSON.stringify(jsonresult);

}
function getAsrMode(){

            var item = null;
            var obj = document.getElementsByName("asr_mode");
            for (var i = 0; i < obj.length; i++) { //遍历Radio 
                if (obj[i].checked) {
                    item = obj[i].value;  
					break;
                }
		    

           }
            if(isfilemode)
			{
				item= "offline";
			}
		   console.log("asr mode"+item);
		   
		   return item;
}

//tmptext: 已经完成语音识别的纯文本内容（不含时间信息）
//tmptime: 一个 JSON 字符串格式的时间戳数组，记录每个字符或单词的起始时间（单位：毫秒）
function handleWithTimestamp(tmptext,tmptime)
{
	console.log( "tmptext: " + tmptext);
	console.log( "tmptime: " + tmptime);
	//如果没有时间戳数据或识别文本为空，则直接返回原文本。
    if(tmptime==null || tmptime=="undefined" || tmptext.length<=0)
	{
		return tmptext;
	}
	tmptext=tmptext.replace(/。|？|，|、|\?|\.|\ /g, ","); // in case there are a lot of "。"  //将所有中文标点（句号、问号、顿号、逗号）以及英文标点（问号、点号、空格）全部统一替换为英文逗号 ,。
	
	//words 是分割后的子句/单词数组
	//jsontime 是二维时间戳数组，形如：[[100, 200], [200, 300], ...]  每个元素是 [起始时间, 结束时间]（单位是毫秒）
	var words=tmptext.split(",");  // split to chinese sentence or english words   // 将文本按逗号分割为短语/词
	var jsontime=JSON.parse(tmptime); //JSON.parse(tmptime.replace(/\]\]\[\[/g, "],[")); // in case there are a lot segments by VAD   // 将 JSON 字符串转为二维数组
	var char_index=0; // index for timestamp  // 用于追踪当前处理到第几个字符（或词）
	var text_withtime="";  //// 最终带有时间戳的文本结果
	for(var i=0;i<words.length;i++)
	{   
	if(words[i]=="undefined"  || words[i].length<=0)
	{
		continue;
	}
    console.log("words===",words[i]);
	console.log( "words: " + words[i]+",time="+jsontime[char_index][0]/1000);
	if (/^[a-zA-Z]+$/.test(words[i]))
	{   // if it is english
		text_withtime=text_withtime+jsontime[char_index][0]/1000+":"+words[i]+"\n";
		char_index=char_index+1;  //for english, timestamp unit is about a word
	}
	else{
        // if it is chinese
		text_withtime=text_withtime+jsontime[char_index][0]/1000+":"+words[i]+"\n";
		char_index=char_index+words[i].length; //for chinese, timestamp unit is about a char
	}
	}

	//0.12:Hello
    //0.45:world
    //0.98:你好
    //1.21:世界
	return text_withtime;
	

}

var is_transmission = false
var transmission_text = ""




function A(jsonMsg){

	var rectxt2 = "" + JSON.parse(jsonMsg.data)['text'];
	rec_text2 = rec_text2 + rectxt2;
	var varArea2 = document.getElementById('varArea2');
	varArea2.value = rec_text2;
}

// 初始化WebSocket连接
function initWebSocket() {
	// 替换为你的WebSocket服务器地址
	var wsUrl = "ws://localhost:8088";

	ws2cs = new WebSocket(wsUrl);

	// WebSocket连接打开
	ws2cs.onopen = function () {
		console.log("WebSocket connection opened");
		// 可以在这里做一些初始化工作
	};

	// 接收到消息
	ws2cs.onmessage = function (event) {
		console.log("Received message from server:", event.data);
		// 你可以在这里处理收到的消息
	};

	// 连接关闭
	ws2cs.onclose = function () {
		console.log("WebSocket connection closed");
	};

	// 连接出错
	ws2cs.onerror = function (error) {
		console.error("WebSocket error:", error);
	};
}

// 在页面加载或需要的时候初始化WebSocket
window.onload = function () {
	initWebSocket();
};


// 语音识别结果; 对jsonMsg数据解析,将识别结果附加到编辑框中
function getJsonMessage(jsonMsg) {
	//console.log(jsonMsg);
	console.log("message: " + JSON.parse(jsonMsg.data)['text']);
	var rectxt = "" + JSON.parse(jsonMsg.data)['text'];
	console.log("rectxt:" + rectxt)
	var asrmodel = JSON.parse(jsonMsg.data)['mode'];
	var is_final = JSON.parse(jsonMsg.data)['is_final'];
	var timestamp = JSON.parse(jsonMsg.data)['timestamp'];
	if (asrmodel == "2pass-offline" || asrmodel == "offline") {

		offline_text = offline_text + handleWithTimestamp(rectxt, timestamp); //rectxt; //.replace(/ +/g,"");
		rec_text = offline_text;
	}
	else {
		rec_text = rec_text + rectxt; //.replace(/ +/g,"");
	}

	if (is_transmission) {
		transmission_text = rec_text
	}


	var varArea = document.getElementById('varArea');

	varArea.value = rec_text;
	console.log("offline_text: " + asrmodel + "," + offline_text);
	console.log("rec_text: " + rec_text);


		// 通过WebSocket发送流水数据到Unity
	if (ws2cs && ws2cs.readyState === WebSocket.OPEN) {
		// 构造消息对象（可以自定义格式）
		var messageObj = {
			type: "stream_text",
			text: rectxt,
			timestamp: timestamp,
			is_final: is_final
		};
		// 以JSON字符串发送
		ws2cs.send(JSON.stringify(messageObj));
		console.log("Sent to Unity: ", messageObj);
	}
	if (isfilemode == true && is_final == true) {
		console.log("call stop ws!");
		play_file();
		wsconnecter.wsStop();

		info_div.innerHTML = "请点击连接";

		btnStart.disabled = true;
		btnStop.disabled = true;
		btnConnect.disabled = false;
	}

}





// 连接状态响应
function getConnState( connState ) {
	if ( connState === 0 ) { //on open
 
 
		info_div.innerHTML='连接成功!请点击开始';
		if (isfilemode==true){
			info_div.innerHTML='请耐心等待,大文件等待时间更长';
			start_file_send();
		}
		else
		{
			btnStart.disabled = false;
			btnStop.disabled = true;
			btnConnect.disabled=true;
		}
	} else if ( connState === 1 ) {
		//stop();
	} else if ( connState === 2 ) {
		stop();
		console.log( 'connecttion error' );
		 
		alert("连接地址"+document.getElementById('wssip').value+"失败,请检查asr地址和端口。或试试界面上手动授权，再连接。");
		btnStart.disabled = true;
		btnStop.disabled = true;
		btnConnect.disabled=false;
 
 
		info_div.innerHTML='请点击连接';
	}
}

function record()
{
 
		 rec.open( function(){
		 rec.start();
		 console.log("开始");
			btnStart.disabled = true;
			btnStop.disabled = false;
			btnConnect.disabled=true;
		 });
 
}

 

// 识别启动、停止、清空操作
function start() {
	
	// 清除显示
	clear();
	//控件状态更新
 	console.log("isfilemode"+isfilemode);
    
	//启动连接
	var ret=wsconnecter.wsStart();
	
	// 1 is ok, 0 is error
	if(ret==1){
		info_div.innerHTML="正在连接asr服务器，请等待...";
		isRec = true;
		btnStart.disabled = true;
		btnStop.disabled = true;
		btnConnect.disabled=true;
 
        return 1;
	}
	else
	{
		info_div.innerHTML="请点击开始";
		btnStart.disabled = true;
		btnStop.disabled = true;
		btnConnect.disabled=false;
 
		return 0;
	}
}

 
function stop() {
		var chunk_size = new Array( 5, 10, 5 );
		var request = {
			"chunk_size": chunk_size,
			"wav_name":  "h5",
			"is_speaking":  false,
			"chunk_interval":10,
			"mode":getAsrMode(),
		};
		console.log(request);
		if(sampleBuf.length>0){
		wsconnecter.wsSend(sampleBuf);
		console.log("sampleBuf.length"+sampleBuf.length);
		sampleBuf=new Int16Array();
		}
	   wsconnecter.wsSend( JSON.stringify(request) );

 
	// 控件状态更新
	
	isRec = false;
    info_div.innerHTML="发送完数据,请等候,正在识别...";

   if(isfilemode==false){
	    btnStop.disabled = true;
		btnStart.disabled = true;
		btnConnect.disabled=true;
		//wait 3s for asr result
	  setTimeout(function(){
		console.log("call stop ws!");
		wsconnecter.wsStop();
		btnConnect.disabled=false;
		info_div.innerHTML="请点击连接";}, 3000 );
 
 
	   
	rec.stop(function(blob,duration){
  
		console.log(blob);
		var audioBlob = Recorder.pcm2wav(data = {sampleRate:16000, bitRate:16, blob:blob},
		function(theblob,duration){
				console.log(theblob);
		var audio_record = document.getElementById('audio_record');
		audio_record.src =  (window.URL||webkitURL).createObjectURL(theblob); 
        audio_record.controls=true;
		//audio_record.play(); 
         	

	}   ,function(msg){
		 console.log(msg);
	}
		);
 

 
	},function(errMsg){
		console.log("errMsg: " + errMsg);
	});
   }
    // 停止连接
 
    

}

function clear() {
 
    var varArea=document.getElementById('varArea');
 
	varArea.value="";
    rec_text="";
	offline_text="";
 
}

// 全局变量
let ftlength = 0;
// ✅ 每次点击，创建新连接，发送新增内容
function sendRecognizedText() {
    const Text = rec_text || offline_text || "";

    if (!Text || Text.length <= ftlength) {
        info_div.innerHTML = "没有新增内容可发送";
        return;
    }

    const finalText = Text.slice(ftlength);
    ftlength = Text.length;

    console.log("累计长度:", ftlength);
    console.log("要发送的新内容:", finalText);

    // ✅ 1. 每次创建新的 WebSocket 实例（短连接模式）
    const sender = new TextSendSocketMethod({
        uri: "ws://localhost:1145",
        msgHandle: function (msg) {
            console.log("本地服务回应:", msg.data);
        },
        stateHandle: function (status) {
            if (status === 0) {
                console.log("socket 已连接，开始发送");
                sender.wsSend({ content: finalText });

                // ✅ 可选：发送完自动关闭连接
                setTimeout(() => sender.wsStop(), 200);  // 留一点缓冲时间
                info_div.innerHTML = "新增文本已发送";
            } else if (status === 1) {
                console.log("socket 已断开");
            } else if (status === 2) {
                console.log("socket 出错");
                info_div.innerHTML = "连接失败，稍后重试";
            }
        }
    });

    // ✅ 2. 启动连接
    sender.wsStart();
}



// 将浏览器中录音的原始音频数据（通常为48kHz）转码为ASR识别模型所需的16kHz音频数据，然后按块(chunk)发送到 WebSocket 服务器进行实时语音识别。
// buffer: 多通道的 Float32Array 缓冲数组，buffer[buffer.length-1] 是最新一帧数据（通常为48kHz）
// powerLevel: 当前音量强度（可以用作 UI 动态音量条）
// bufferDuration: 当前缓冲时长，单位毫秒
// bufferSampleRate: 当前录音采样率（通常是 48000Hz）
// newBufferIdx, asyncEnd: 录音库内部使用的标志参数
function recProcess( buffer, powerLevel, bufferDuration, bufferSampleRate,newBufferIdx,asyncEnd ) {
	if ( isRec === true ) {  //检查是否正在录音（isRec 是外部定义的状态变量）。
		var data_48k = buffer[buffer.length-1];   //取最新的一帧录音数据（通常是 48000Hz 采样率），它是 Float32Array 类型。
 
		var  array_48k = new Array(data_48k);  //将该帧数据装入一个数组中，供后续采样转换函数 Recorder.SampleData 使用。
		var data_16k=Recorder.SampleData(array_48k,bufferSampleRate,16000).data;  //调用 Recorder.SampleData 函数将 48kHz 的音频数据重新采样（Downsample）为 16kHz，这是很多语音识别模型（如 Paraformer）所要求的标准输入格式。
 
		sampleBuf = Int16Array.from([...sampleBuf, ...data_16k]); // 将新的 16kHz 数据追加进 sampleBuf 这个缓存数组中。注意：这行代码使用了扩展运算符将两个数组拼接后再创建新数组，虽然直观但开销较大。
		var chunk_size=960; // for asr chunk_size [5, 10, 5]  //定义发送块大小为 960
		info_div.innerHTML=""+bufferDuration/1000+"s";
		while(sampleBuf.length>=chunk_size){   //只要缓冲区中累积的数据大于一个块，就持续发送。
		    sendBuf=sampleBuf.slice(0,chunk_size);  //取出 chunk_size 大小的前段音频作为发送块 sendBuf，并更新 sampleBuf，去掉已发送的部分。
			sampleBuf=sampleBuf.slice(chunk_size,sampleBuf.length);
			wsconnecter.wsSend(sendBuf);  //通过 WebSocket 发送该音频数据块到远程语音识别服务器。此处的 sendBuf 是 Int16Array，通常服务器会预期此类型为原始 PCM 流数据。
			
			
		 
		}
		
 
		
	}
}

function getUseITN() {
	var obj = document.getElementsByName("use_itn");
	for (var i = 0; i < obj.length; i++) {
		if (obj[i].checked) {
			return obj[i].value === "true";
		}
	}
	return false;
}

//###########################################################################################
//#####################################초기화################################################

const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const cloudApp = express();
const dbConn = require('./mariadbConn');
const timeGetter = require('./timeConvert');
const portNum = 5000;
const fogAddress = 'http://223.194.33.67:10033';

const interServerSocketIO = require('socket.io-client');
var interServerSocket = interServerSocketIO(fogAddress);

var currentUser = 'none';

cloudApp.use(bodyParser.json());
cloudApp.use(bodyParser.urlencoded({extended: true}));
cloudApp.use(express.static('views/cssAndpics'));
cloudApp.use('/socket.io', express.static('node_modules/socket.io'));
cloudApp.use(cors());

//UI용 소켓 만들기
var http = require('http').Server(cloudApp);
var io = require('socket.io')(http);

//###########################################################################################
//###################################서버 간 소켓 통신#######################################

interServerSocket.on('connect', function(){
    console.log('####connected####');
});

interServerSocket.on('disconnect', function(){
    console.log('Edge socket is disconnected');
});


interServerSocket.on('house1Msg', function(databean){
    var fogDepTime = timeGetter.convertToMilli(databean.house[0].fogDepTime);
    var imsiData = {msgID: databean.house[0].msgID, fogDepTime: fogDepTime};
    interServerSocket.emit('house1SyncReqFromCloud', imsiData);
    console.log('house1Msg received. msgID: '+databean.house[0].msgID);
});

interServerSocket.on('house1SyncResFromFog', function(databean){
    console.log('house1SyncResFromFog has arrived. ');
    var msgID = timeGetter.msgIDToMilli(databean.house[0].msgID);
    var msgIDLast, saveParam;
    // DB 가장 최근 데이터와 시간 차이를 계산, 60초(1분)이상 차이 난다면 저장. 
    dbConn.getTheLastRow('house1').catch(
        (err)=>{console.log(err);}
    ).then(
        (result)=>{
	    if(result != 0){
                msgIDLast = timeGetter.msgIDToMilli(result[0].msgID);
                saveParam = msgID - msgIDLast;
                if(saveParam>=60000){
                    // socketGlobal.emit('cloudMsg', databean);
                    dbConn.insertDataToCloud(databean, 'house1');
                }
	    }else if(result == 0){
		dbConn.insertDataToCloud(databean, 'house1');
	    }
        }
    );
});

interServerSocket.on('house2Msg', function(databean){
    var fogDepTime = timeGetter.convertToMilli(databean.house[1].fogDepTime);
    var imsiData = {msgID: databean.house[1].msgID, fogDepTime: fogDepTime};
    interServerSocket.emit('house2SyncReqFromCloud', imsiData);
    console.log('house2Msg received. msgID: '+databean.house[1].msgID);
});

interServerSocket.on('house2SyncResFromFog', function(databean){
    console.log('house2SyncResFromFog has arrived. ');
    var msgID = timeGetter.msgIDToMilli(databean.house[1].msgID);
    var msgIDLast, saveParam;
    // DB 가장 최근 데이터와 시간 차이를 계산, 60초(1분)이상 차이 난다면 저장. 
    dbConn.getTheLastRow('house2').catch(
        (err)=>{console.log(err);}
    ).then(
        (result)=>{
	    if(result != 0){
                msgIDLast = timeGetter.msgIDToMilli(result[0].msgID);
                saveParam = msgID - msgIDLast;
                if(saveParam>=60000){
                    dbConn.insertDataToCloud(databean, 'house2');
                }
	    }else if(result == 0){
		dbConn.insertDataToCloud(databean, 'house2');
	    }
        }
    );
});

//###########################################################################################
//#################################http GET, POST 통신#######################################
cloudApp.get('/', function(req, res){
    console.log('This is the home address.');
    console.log('Redirecting to the login page.');
    res.redirect('/login.do');
});

cloudApp.get('/login.do', function(req, res){
    console.log('Entered login page.');
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

cloudApp.get('/pastdatapage.do', function(req, res){
    console.log('cloudApp.get: pastdatapage.do received.');
    currentUser = req.query.user;
    console.log('pastdatapage.do: currentUser: '+currentUser);
    res.sendFile(path.join(__dirname, 'views', 'pastdatapage.html'));
});

cloudApp.post('/loginClick.do', function(req, res){
    interServerSocket.disconnect();
    console.log('Log-in button was clicked.');
    var id = req.body.logID;
    var pw = req.body.password;
    var userLoginClickTime = req.body.userLoginClickTime;
    console.log(req.body);

    dbConn.loginQuery(id, pw).then(function(resultValue){
        if(resultValue == 'No id' || resultValue == 'Wrong password'){
            console.log('아이디/비밀번호가 일치하지 않습니다.');
            res.sendFile(path.join(__dirname, 'views', 'index.html'));
        }else{
            console.log(resultValue.id+'님 환영합니다. ');
            res.redirect(fogAddress+'/realdata.do?user='+resultValue.id+'&userLoginClickTime='+userLoginClickTime);
        }
    }).then(function(){
	interServerSocket.connect();
    });
});

cloudApp.post('/setData.do', function(req, res){
    console.log('setData.do. requested.');
    res.redirect(fogAddress+'/realdata.do');
});

//http 리스너
http.listen(portNum, function(){
    console.log('Listening on port: '+portNum);
});

//###########################################################################################
//################################User와 소켓통신##########################################
io.on('connection', function(socket){
    console.log('Socket connected with user.');
    socketGlobal = socket;
    socket.on('disconnect', function(){
        console.log('User '+currentUser+' disconnected.');
    });
    socket.on('userWho', function(){
        socket.emit('currentUserIs', currentUser);
    });
    socket.on('pastGraphDataReq', function(houseName){
        dbConn.getGraphDataset(houseName)
        .catch((err)=>{console.log(err);})
        .then((result)=>{
            socket.emit('pastGraphDataRes', {result, houseName});
        });
    });
    socket.on('last5DataReq', function(houseName){
        dbConn.getLast5Data(houseName)
        .catch((err)=>{console.log(err);})
        .then((result)=>{
            socket.emit('last5DataRes', {result, houseName});
        });
    });
    socket.on('pastPageUserReq', function(pastPageUserReqTime){
        socket.emit('pastPageUserRes', pastPageUserReqTime);
    });
});

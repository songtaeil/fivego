#!/bin/bash

##################################
#BATCH Process for monthly, daily power.it is related with db for power.  it should be set  for only one platform. 
JAVA_OPTS=
#JAVA_OPTS="-Dspring.profiles.active=setest"
##################################


function stop_tomcat(){
	tomcatProcess=$(ps aux|grep $TOMCAT_PATH |grep $WHOAMI)
	echo "tomcatProcess=$tomcatProcess"
	if [ -n "$tomcatProcess" ];then
		echo "shutdown tomcat process=$tomcatProcess"	
		$TOMCAT_PATH/bin/shutdown.sh
		tomcatProcess=$(ps aux|grep tomcat |grep $WHOAMI)
		sleep 2;
	fi
}


function start_tomcat(){
	$TOMCAT_PATH/bin/startup.sh
}

###################################################
# Tomcat check.
###################################################

if [ ! -e $TOMCAT_PATH ];then
	URL=$(wget https://tomcat.apache.org/download-${TOMCAT_VERSION}0.cgi --no-check-certificate -q -O - | grep tar.gz | head -n 1);
        URL=${URL#*\"};     # remove string until first double quote from head.
        URL=${URL%%\"*};    # remove string until first double quote from end.
        FILE_NAME=${URL##*/}
	FILE_NAME_ONLY=${FILE_NAME%.tar*};
  	echo "###############################################"
	echo "#Install & setting Application Web Server(Tomcat)"
	echo "TOMCAT URL=$URL"
	echo "DOWNLOADED TOMCAT FILE NAME=$FILE_NAME"
	echo "UNZIPPED TOMCAT FILE NAME=$FILE_NAME_ONLY"
	echo "###############################################"

	wget $URL
        echo "untar ..."
	tar zxf $FILE_NAME
	echo "mv  $FILE_NAME_ONLY $BUILD_DIR/tomcat"
	mv $FILE_NAME_ONLY $TOMCAT_PATH
	echo "rm $FILE_NAME"
	rm $FILE_NAME
	
	echo "copy certificate  $CERT_FILE $TOMCAT_PATH/cert"
	mkdir $TOMCAT_PATH/cert
	cp $CERT_FILE $TOMCAT_PATH/cert
fi


#stop_tomcat
kill_tomcat

if [ ! -e $TOMCAT_PATH/cert ];then
        echo "copy certificate  $CERT_FILE $TOMCAT_PATH/cert"
        mkdir $TOMCAT_PATH/cert
        cp $CERT_FILE $TOMCAT_PATH/cert
fi

echo -e "\n#Copy $MODIFIED_SERVER_XML to $TOMCAT_PATH/conf/server.xml \n"
cp $MODIFIED_SERVER_XML $TOMCAT_PATH/conf

echo -e "\n#Modify port to HTTP_PORT[$HTTP_PORT], HTTPS_PORT[$HTTPS_PORT], AJP_PORT[$AJP_PORT], SHUTDOWN_PORT[$SHUTDOWN_PORT] in $TOMCAT_PATH/conf/server.xml"
sed -i 's/8080/'$HTTP_PORT'/g' $SERVER_XML
sed -i 's/8443/'$HTTPS_PORT'/g' $SERVER_XML
sed -i 's/8009/'$AJP_PORT'/g' $SERVER_XML
sed -i 's/8005/'$SHUTDOWN_PORT'/g' $SERVER_XML



echo -e "\n#############################################"
echo "#4. deploy :  (mvn)"
echo -e "#############################################\n"
OUTPUT_WAR_FILE_NAME=acm
OUTPUT_WAR_FILE_EXT=war
OUTPUT_WAR_FILE=$(pwd)/target/$OUTPUT_WAR_FILE_NAME.$OUTPUT_WAR_FILE_EXT
echo "BUILD FILE : $OUTPUT_WAR_FILE"
echo "----------------------------------"
#stop_tomcat
#kill_tomcat
if [ -e $WEB_APPS_ROOT/$OUTPUT_WAR_FILE_NAME.$OUTPUT_WAR_FILE_EXT ];then
	echo "Remove $WEB_APPS_ROOT/$OUTPUT_WAR_FILE_NAME.$OUTPUT_WAR_FILE_EXT"
	rm $WEB_APPS_ROOT/$OUTPUT_WAR_FILE_NAME.$OUTPUT_WAR_FILE_EXT
fi
#count=0
#while [ -e $WEB_APPS_ROOT/$OUTPUT_WAR_FILE_NAME ];do
#	echo "Wait until previous dir[$WEB_APPS_ROOT/$OUTPUT_WAR_FILE_NAME] is removed. count:$count"
#	sleep 1
#	if [ $count -gt 4 ];then
#		echo "rm $WEB_APPS_ROOT/$OUTPUT_WAR_FILE_NAME"
		rm -rf $WEB_APPS_ROOT/$OUTPUT_WAR_FILE_NAME
#	fi
#	count=$((count+1))
#done

if [ -e $WEB_APPS_ROOT/ROOT ];then
	echo "Remove $WEB_APPS_ROOT/ROOT"
	rm -rf $WEB_APPS_ROOT/ROOT
fi
echo "----------------------------------"

echo -e "Build Image(war) File Copy \nFROM: \t$(ls -al $OUTPUT_WAR_FILE)"
cp $OUTPUT_WAR_FILE $WEB_APPS_ROOT
echo -e "TO: \t$(ls -al $WEB_APPS_ROOT/acm.war)"

echo "----------------------------------"
cd $BUILD_DIR

echo -e "\n###########################################"
echo  "restart Tomcat"
echo -e "###########################################\n"
#stop_tomcat
kill_tomcat

if [[ $1 = "test" ]];then
JAVA_OPTS="-Dspring.profiles.active=setest,goneOff"
echo -e "\n enable bath !!!!!!!"
export JAVA_OPTS
fi

start_tomcat


LOCAL_IP_ADDR=$(ip route get 8.8.8.8 | awk 'NR==1 {print $NF}')
echo -e "\n###########################################"
echo "#Done Deploy. $(date)"
echo "#Try access to Web"
if [[ $PROTOCOL = "https"* ]];then
	echo "#https://$LOCAL_IP_ADDR:$HTTPS_PORT"
else
	echo "#http://$LOCAL_IP_ADDR:$HTTP_PORT"
fi

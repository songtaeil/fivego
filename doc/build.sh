#!/bin/bash
######################################
#if you want to test this web application with multiple tomcat
#then, should modify port below.
#each tomcat have to be launcehd with unique port in same linux system,
#####################################
#Select Protocol  "https://" or "http://"
PROTOCOL="https://"
#ORIGINAL HTTP_PORT = 8080
HTTP_PORT=8080
#ORIGINAL HTTPS_PORT = 8443
HTTPS_PORT=8443
#ORIGINAL AJP_PRORT = 8009
AJP_PORT=8073
#ORIGINAL SHUTDOWN_PORT = 8005
SHUTDOWN_PORT=8074
#TEST_MODE 
TEST_MODE=TRUE
###################################
# variables for Tomcat(Application Web Server)
#Tomcat version : 7 or 8
TOMCAT_VERSION=7
##########################
#Amazon Deploy mode
AMAZON_DEPLOY=
#########################
#DB MODE
#LOCAL : local db.
#42_DEV : 10.177.207.42 server DB : default value.
#AMAZON_DEV : amazon dev
#AMAZON_PROD : amazon production
DBMODE=42_DEV
#########################
#MQTT Gone Off Enable
#for official test & deply. MQTT_GONE_OFF_ENABLE should be true on compile time or 
#be launched by spring profile "-Dspring.profiles.active=xxxx" in local_deply.sh/amazon_deply.sh on deploy time
MQTT_GONE_OFF_ENABLE=FALSE
ARRAY_ZERO_PADDING_MODE=TRUE
###################################
#DB Setting.
#default db is below
###################################
if [[ $DBMODE = "AMAZON" || $AMAZON_DEPLOY = "TRUE" ]];then
        echo "# set amazon deploy" 
	DB_URL="jdbc:mysql://rds-solar-pemspdb-v2.czdruk2qpzcy.us-west-2.rds.amazonaws.com:3306/pemspdb"
	DB_USERNAME=dbmaster
	DB_PASSWORD=!tkddka14
elif [ $DBMODE = "42_DEV" ];then
        echo "# set 42 server DB" 
        DB_URL="jdbc:mysql://10.177.207.42:3306/acmtdb"
        DB_USERNAME=yongsung85.kim
        DB_PASSWORD=1234
elif [ $DBMODE = "LOCAL" ];then
        echo "># set local server DB" 
        DB_URL="jdbc:mysql://localhost:3306/acmtdb"
        DB_USERNAME=yongsung85.kim
        DB_PASSWORD=1234
else
    echo "# ERROR.... DB is not set DBMODE: ${DBMODE}. set DBMODE to 42_DEV(default) or AMAZON or LOCAL" 
    exit -1;
fi
#########################

BUILD_DIR=$(pwd)
TOMCAT_PATH=$BUILD_DIR/tomcat
WEB_APPS_ROOT=$TOMCAT_PATH/webapps
SERVER_XML=$TOMCAT_PATH/conf/server.xml
MODIFIED_SERVER_XML=$BUILD_DIR/sample/tools/tomcat/${TOMCAT_VERSION}/server.xml
CERT_FILE=$BUILD_DIR/sample/tools/cert/rest.jks
WHOAMI=$(whoami)
echo "######################################"
echo "BUILD_DIR=$BUILD_DIR"
echo "TOMCAT_VERSION=$TOMCAT_VERSION"
echo "TOMCAT_PATH=$TOMCAT_PATH"
echo "WEB_APPS_ROOT=$WEB_APPS_ROOT"
echo "SERVER_XML=$SERVER_XML"
echo "MODIFIED_SERVER_XML=$MODIFIED_SERVER_XML"
echo "who am I:$WHOAMI"
echo "#######################################"

#####################################################
if [[ $1 = "official" ]];then
        PROTOCOL="https://"
        HTTPS_PORT=443; HTTP_PORT=80; AJP_PORT=8009;SHUTDOWN_PORT=8005;
	TEST_MODE=
elif [[ $1 = "test" ]];then
        PROTOCOL="https://"
        HTTPS_PORT=9443; HTTP_PORT=8093; AJP_PORT=8909;SHUTDOWN_PORT=8905;
elif [[ $1 = "daily" ]];then
        PROTOCOL="https://"
        HTTPS_PORT=9444; HTTP_PORT=8094; AJP_PORT=8409; SHUTDOWN_PORT=8405;
elif [[ $1 = "field" ]];then
        PROTOCOL="https://"
        HTTPS_PORT=7443; HTTP_PORT=8097; AJP_PORT=8709; SHUTDOWN_PORT=8705;
elif [[ $1 = "delta" ]];then
        PROTOCOL="https://"
        HTTPS_PORT=5443; HTTP_PORT=8095; AJP_PORT=8509; SHUTDOWN_PORT=8505;
elif [[ $1 = "ess" ]];then
        PROTOCOL="https://"
        HTTPS_PORT=6443; HTTP_PORT=8096; AJP_PORT=8509; SHUTDOWN_PORT=8605;

elif [[ $1 = "http" ]];then
        PROTOCOL="http://"
        HTTP_PORT=8090; AJP_PORT=8099; SHUTDOWN_PORT=8095;
fi
echo "######################################"
echo "PROTOCOL=$PROTOCOL"
echo "HTTP_PORT=$HTTP_PORT"
echo "HTTPS_PORT=$HTTPS_PORT"
echo "AJP_PORT=$AJP_PORT"
echo "SHUTDOWN_PORT=$SHUTDOWN_PORT"
echo "DB_URL=$DB_URL"
echo "MQTT_GONE_OFF_ENABLE=$MQTT_GONE_OFF_ENABLE"
echo "ARRAY_ZERO_PADDING_MODE=$ARRAY_ZERO_PADDING_MODE"
echo "JAVA_OPTS for Batch=$JAVA_OPTS"
echo "#######################################"

#####################################################


# variables for devon framework library
#######################################
DEVON_DUMP_FILE_PATH=$(find . -name "devon_repo*.zip")
DEVON_JAR_FILE=$(find . -name "devon-core*.jar")
MAVEN_DIR=~/.m2
#######################################

function errorCheck() {
	local RET=$1
	local PORT=$2
	local PORT_NAME=$3
        if [[ $1 != 0 ]]; then
                echo "\n#######################################"
                echo "#######################################"
                echo "Error! Tomcat Setting. $PORT_NAME[$PORT] has been used already!!!!! "
		echo "You have to set other port in build.sh upper"
                echo "#######################################"
                echo "#######################################\n"
                exit 0;
        fi
}

function check_port() {
        local PORT=$1
	local PORT_NAME=$2
	RET=$(netstat -an | grep LISTEN |grep $PORT)

	if [ -n "$RET" ];then
		return 1
	else
		echo "$PORT_NAME[$PORT] can be used."
		return 0
	fi
}

function kill_tomcat(){
	process_id=$(ps ax |grep -v grep | grep $TOMCAT_PATH | awk '{print $1}')
	if [ -n "${process_id}" ];then
		echo "Kill previous tomcat process[$process_id]"
		kill -9 $process_id
		sleep 1
	fi
}


###############################
# Start Logic
###############################



if [ ! -e "${MAVEN_DIR}/repository/devonframe" ]; then
	echo "#############################################################"
	echo "#install devon framework library for Enervu"
	echo "#############################################################"
        if [ -e "${MAVEN_DIR}/repository" ]; then
                echo "bak up previous maven repository"  
                mv ${MAVEN_DIR}/repository ${MAVEN_DIR}/repository_back
        fi
        echo "unzip $DEVON_DUMP_FILE_PATH to $MAVEN_DIR"
        unzip  $DEVON_DUMP_FILE_PATH -d $MAVEN_DIR
fi


function check_service_port(){
    check_port $HTTP_PORT "HTTP_PORT"
    errorCheck $? $HTTP_PORT "HTTP_PORT"


    check_port $HTTPS_PORT "HTTPS_PORT" 
    errorCheck $? $HTTPS_PORT "HTTPS_PORT"

    check_port $AJP_PORT "AJP_PORT" 
    errorCheck $? $AJP_PORT "AJP_PORT"

    check_port $SHUTDOWN_PORT "SHUTDOWN_PORT"
    errorCheck $? $SHUTDOWN_PORT "SHUTDOWN_PORT"
}

if [[ $AMAZON_DEPLOY != "TRUE" ]];then
echo "not amazon"
    kill_tomcat
    echo "###############################################"
    echo "#Check Service Port..."
    echo "###############################################"
    check_service_port
else
    echo "amazon"
fi


echo "###############################################"
echo "#Setting Serice Properites"
echo "###############################################"

echo -e "\n#Set port in launch.properties  to this.port."
sed -i 's/http_port=.*/http_port='$HTTP_PORT'/' $BUILD_DIR/src/acms/src/main/resources/config/launch.properties
sed -i 's/https_port=.*/https_port='$HTTPS_PORT'/' $BUILD_DIR/src/acms/src/main/resources/config/launch.properties

echo -e "\n#Remove test_mode in launch.properties."
sed -i 's/test_mode=.*/test_mode='$TEST_MODE'/' $BUILD_DIR/src/acms/src/main/resources/config/launch.properties

#use different dilimeter since protocol contains "//"
sed -i 's%protocol=.*%protocol='${PROTOCOL}'%' $BUILD_DIR/src/acms/src/main/resources/config/launch.properties
echo -e "\n#Check port is available"
sed -i 's/mqtt_goneoff_enable=.*/mqtt_goneoff_enable='$MQTT_GONE_OFF_ENABLE'/' $BUILD_DIR/src/acms/src/main/resources/config/launch.properties
echo -e "\n#set mqtt gone off mode : $MQTT_GONE_OFF_ENABLE"
sed -i 's/array_zero_padding_mode=.*/array_zero_padding_mode='$ARRAY_ZERO_PADDING_MODE'/' $BUILD_DIR/src/acms/src/main/resources/config/launch.properties
echo -e "\n#set array_zero_padding_mode : $ARRAY_ZERO_PADDING_MODE"

echo -e"\n#Set db properties"
echo "DB URL=$DB_URL"
echo "DB_USERNAME=$DB_USERNAME"
sed -i 's%db.local.url=.*%db.local.url='$DB_URL'%' $BUILD_DIR/src/acms/src/main/resources/config/db.properties
sed -i 's%db.local.username=.*%db.local.username='$DB_USERNAME'%' $BUILD_DIR/src/acms/src/main/resources/config/db.properties
sed -i 's%db.local.password=.*%db.local.password='$DB_PASSWORD'%' $BUILD_DIR/src/acms/src/main/resources/config/db.properties


echo -e"\n#Set log properties for deploy system"
echo "set log appender from console to file"
sed -i 's%ref="console"%ref="file"%' $BUILD_DIR/src/acms/src/main/resources/log4j.xml 


echo -e "\n#Set build Date"
sed -i 's%buildDate=.*%buildDate='$(date --iso-8601=seconds)'%' $BUILD_DIR/src/acms/src/main/resources/config/launch.properties

echo -e "\n#Set Git Log"
sed -i 's%git.branch=.*%git.branch='$(git rev-parse --abbrev-ref HEAD)'%' $BUILD_DIR/src/acms/src/main/resources/config/launch.properties
sed -i 's%git.version=.*%git.version='$(git describe --tags)[$(git rev-parse HEAD)]'%' $BUILD_DIR/src/acms/src/main/resources/config/launch.properties


cd $BUILD_DIR/src/acms
echo "Cur=$(pwd)"
echo -e "\n#############################################"
echo "2. build clean(mvn clean)"
echo -e "#############################################\n"
mvn clean

echo -e "\n#############################################"
echo "#3. build (mvn)"
echo -e "#############################################\n"
mvn 

echo "\n###########################################"
echo  "Build finished : $(date)"
echo  "- Last git log of this build\n"
echo "--------------------------------------------"
git log -1

# launch deploy shell script with all variables defined here.
if [[ $AMAZON_DEPLOY = "TRUE" ]];then
    echo "###################################################"
    echo "#>>>> Deploy Amazon Server"
    echo "###################################################"
else
    echo "###################################################"
    echo "#>>>> Deploy Local Server"
    echo "###################################################"
    . $BUILD_DIR/deploy_local.sh
fi

echo "#Done Build and Deploy. $(date)"
echo -e "###########################################\n"


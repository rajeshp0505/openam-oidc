export STAGE=/opt/iam/stage/openam
export SSO_ADM=/opt/iam/stage/openam/tools/SSOAdminTools-13.0.0
export SSO_CONFIGURATOR_HOME=$STAGE/tools/SSOConfiguratorTools-13.0.0
export passFile=/opt/iam/stage/openam/ampass

# STEP -1
java -jar $SSO_CONFIGURATOR_HOME/openam-configurator-tool-13.0.0.jar --file $STAGE/conf/base.conf


# STEP -2 #Deploy SSOADM tools
echo "Deploying ssoadm"
cd $SSO_ADM
./setup --acceptLicense --path /opt/iam/auth/

#Configuration
echo "Starting OpenAM Configuration"
echo Test@1234 > $passFile
chmod 400 $passFile


# STEP -3
echo "Creating realm"

$SSO_ADM/auth/bin/ssoadm create-realm \
--adminid amadmin \
--password-file $passFile \
--realm appusers

# STEP -4
echo "Updating realm Alias"
$SSO_ADM/auth/bin/ssoadm set-realm-attrs \
--adminid amadmin \
--password-file $passFile \
--realm /appusers \
--servicename sunIdentityRepositoryService \
--attributevalues sunOrganizationAliases=user.auth.com


# STEP -6
echo "Adding FDQN Map "

$SSO_ADM/auth/bin/ssoadm update-server-cfg \
--adminid amadmin \
--password-file $passFile \
--servername default \
--datafile $STAGE/conf/fqdn.conf

# STEP -7
echo "Creating OIDC groovy script adapter"
$SSO_ADM/auth/bin/ssoadm create-sub-cfg \
--realm /appusers \
--servicename ScriptingService \
--subconfigname scriptConfigurations/scriptConfiguration \
--subconfigid userClaims \
--adminid amadmin \
--password-file $passFile \
--attributevalues "script-file= $STAGE/conf/claims.groovy" \
--datafile $STAGE/conf/claims.conf

# STEP -8
echo "Creating oauth provider"

$SSO_ADM/auth/bin/ssoadm add-svc-realm \
--adminid amadmin \
--password-file $passFile \
--servicename OAuth2Provider \
--realm /appusers \
--datafile $STAGE/conf/oauth-provider.conf

# STEP -9
echo "Creating oauth client"
$SSO_ADM/auth/bin/ssoadm create-agent \
--adminid amadmin \
--password-file $passFile \
--realm /appusers \
--agenttype OAuth2Client \
--agentname appuserclient \
--datafile $STAGE/conf/oauth-client.conf


# STEP -5
echo "Creating site.. "
$SSO_ADM/auth/bin/ssoadm create-site \
--adminid amadmin \
--password-file $passFile \
--sitename lb \
--siteurl http://localhost.auth.com:8080/auth \
--secondaryurls http://user.auth.com:8080/auth
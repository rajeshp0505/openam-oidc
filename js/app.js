var example = angular.module("example", ['ui.router', 'angular-jwt']);

example.factory('ConstantService', function() {
    return {
        apUrl:"http://localhost:9090"
    };
});

example.config(function ($stateProvider, $urlRouterProvider) {
    $stateProvider
        .state('login', {
            url: '/login',
            templateUrl: 'templates/login.html',
            controller: 'LoginController'
        })
        .state('dashboard', {
            url: '/dashboard',
            templateUrl: 'templates/dashboard.html',
            controller: 'DashboardController'
        })
        .state('userinfo', {
            url: '/userinfo',
            templateUrl: 'templates/userinfo.html',
            controller: 'UserInfoController'
        });
    $urlRouterProvider.otherwise('/login');

});

example.controller("LoginController", function ($scope) {
    $scope.login = function () {
        var state = Math.floor(Math.random() * 10000000000000000);
        var clientid = "auserclient";
        var redirUrl = "http://localhost:9090/secure.html";
        var apUrl = "http://localhost:9090";
        var amURL = "http://user.auth.com:8080/auth";
        var clientid = "appuserclient";
        var scope = "profile openid";
        var redirUrlEncoded = encodeURIComponent(redirUrl)
        var scopeEncoded = encodeURIComponent(scope)
        var url = amURL + "/oauth2/authorize?state=" + state + "&client_id=" + clientid + "&redirect_uri=" + redirUrlEncoded + "&response_type=code&scope=" + scopeEncoded;
        var openamconf = {
            authInfo: {
                clientId: clientid,
                state: state,
                redirectUrl: redirUrl,
                scope: scope,
                amUrl: amURL,
                apUrl: apUrl,
                authUrl: url
            }
        };


        window.localStorage.setItem("openamconf", JSON.stringify(openamconf));
        window.location.href = url
    }

});

example.service('oidcservce', function ($http) {
    var accessTokenData;
    var accessTokenError;
    this.getAccessToken = function (authCode) {

        var authInfo = JSON.parse(window.localStorage.getItem("openamconf")).authInfo;
        console.log("authCode for access token: " + authCode)
        var authResponse_type = 'id_token%20token';
        var grantType = 'authorization_code';
        var accessTokenUrl = authInfo.amUrl + "/oauth2/access_token"
        var data = 'grant_type=' + encodeURIComponent(grantType) +
            '&client_id=' + encodeURIComponent(authInfo.clientId) +
            '&redirect_uri=' + encodeURIComponent(authInfo.redirectUrl) +
            '&response_type=' + encodeURIComponent(authResponse_type) +
            '&code=' + encodeURIComponent(authCode) +
            '&client_secret=ignore';
        console.log("accessTokenUrl : " + accessTokenUrl)
        var req = {
            method: 'POST',
            url: accessTokenUrl,
            useDefaultBehavior: false,
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            data: data
        };


        return $http(req);

    }

    this.getUserInfo = function (access_token) {

        var authInfo = JSON.parse(window.localStorage.getItem("openamconf")).authInfo;
        var userInfoEndpoint = authInfo.amUrl + "/oauth2/userinfo"
        console.log("userInfoEndpoint : " + userInfoEndpoint)
        var Bearer = 'Bearer ' + access_token
        var req = {
            method: 'POST',
            url: userInfoEndpoint,
            useDefaultBehavior: false,
            headers: {'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': Bearer}
        };


        return $http(req);

    }

    this.getTokenInfo = function (access_token) {

        var authInfo = JSON.parse(window.localStorage.getItem("openamconf")).authInfo;
        var tokenInfoUrl = authInfo.amUrl + "/oauth2/tokeninfo?access_token="
        tokenInfoUrl = tokenInfoUrl + access_token;

        var req = {
            method: 'GET',
            url: tokenInfoUrl,
            headers: {'Content-Type': 'application/x-www-form-urlencoded'}
        };

        console.log("tokenInfo request : " + JSON.stringify(req))
        return $http(req);

    }
});

function userTokenCall(access_token, oidcservce, $scope) {
    if (angular.isDefined(access_token) && access_token != null) {

        var userInfoData = oidcservce.getUserInfo(access_token).then(function (response) {
                console.log("response:" + JSON.stringify(response));
                $scope.userInfo = response.data
                window.localStorage.setItem("userInfoData", JSON.stringify(response));
            },
            function (error) {
                console.log("error:" + JSON.stringify(error));
                window.localStorage.setItem("userInfoData", null);
                //window.location.href = apUrl + "/index.html#login";
            }
        );
        var tokenInfoData = oidcservce.getTokenInfo(access_token).then(function (response) {
                console.log("response:" + JSON.stringify(response));
                $scope.tokenInfo = response.data
                window.localStorage.setItem("tokenInfoData", JSON.stringify(response));
            },
            function (error) {
                console.log("error:" + JSON.stringify(error));
                window.localStorage.setItem("tokenInfoData", null);
                //window.location.href = apUrl + "/index.html#login";
            }
        );
    }
}
example.controller("DashboardController", function ($scope, $http, oidcservce, jwtHelper,ConstantService) {
    if (window.localStorage.getItem("openamconf") === null) {
        window.location.href = "http://localhost:9090/index.html#login";
    } else {
        var authInfo = JSON.parse(window.localStorage.getItem("openamconf")).authInfo;
        var apUrl = authInfo.apUrl;
        var authDataObj = JSON.parse(window.localStorage.getItem("authData"));
        if (typeof authDataObj === 'undefined' || authDataObj === null) {
            console.log("Auth Data is empty,redirecting..");
            window.location.href = apUrl + "/index.html#login";
        } else {
            $scope.authData = authDataObj.oauth;
            var authData = authDataObj.oauth
            console.log("authData ::" + authData);

            var isIdTokenValid = false;
            var accessTokenData = JSON.parse(window.localStorage.getItem("accessTokenData"));
            console.log("accessTokenData ::::" + accessTokenData);
            var id_token;
            var access_token;
            var accessData
            if (accessTokenData != null) {
                var data = JSON.stringify(accessTokenData.data);
                accessData = JSON.parse(data)
                id_token = accessData.id_token;
                access_token = accessData.access_token;
            }
            console.log("ID token ispresent:" + id_token);
            if (angular.isDefined(id_token) && id_token != null) {
                var isExpired = jwtHelper.isTokenExpired(id_token);
                console.log("ID token isExpired:" + isExpired);
                if (!isExpired) {
                    isIdTokenValid = true;
                }
            }

            if (!isIdTokenValid) {
                var accessTokenData = oidcservce.getAccessToken(authData.authCode).then(function (response) {
                        console.log("access token response:" + JSON.stringify(response));
                        $scope.accessToken = response.data
                        accessData = response.data
                        window.localStorage.setItem("accessTokenData", JSON.stringify(response));
                        var data = response.data;
                        id_token = data.id_token;
                        access_token = data.access_token;
                        $scope.token = id_token;
                        $scope.$watch('token', function (token) {
                            if (!token) return;
                            $scope.decodedToken = jwtHelper.decodeToken(token);
                        });
                        userTokenCall(access_token, oidcservce, $scope);
                    },
                    function (error) {
                        console.log("error:" + JSON.stringify(error));
                        //window.localStorage.setItem("authData", null);
                        window.localStorage.setItem("accessTokenData", null);
                        window.location.href = apUrl + "/index.html#login";
                    }
                );
                console.log("id_token ::::" + id_token);
                console.log("access_token ::::" + access_token);

            }
            if (isIdTokenValid) {
                $scope.accessToken = accessData
                $scope.token = id_token;
                $scope.$watch('token', function (token) {
                    if (!token) return;
                    $scope.decodedToken = jwtHelper.decodeToken(token);
                });
                userTokenCall(access_token, oidcservce, $scope);
            }

        }
    }


});


example.controller("UserInfoController", function ($scope, $http, oidcservce, jwtHelper) {

    var authInfo = JSON.parse(window.localStorage.getItem("openamconf")).authInfo;
    var apUrl = authInfo.apUrl;
    var authDataObj = JSON.parse(window.localStorage.getItem("authData"));
    if (typeof authDataObj === 'undefined' || authDataObj === null) {
        console.log("Auth Data is empty,redirecting..");
        window.location.href = apUrl + "/index.html#login";
    } else {
        var isIdTokenValid = false;
        var accessTokenData = JSON.parse(window.localStorage.getItem("accessTokenData"));
        console.log("accessTokenData ::::" + accessTokenData);
        var id_token;
        var access_token;
        if (accessTokenData != null) {
            var data = JSON.stringify(accessTokenData.data);
            datObj = JSON.parse(data)
            id_token = datObj.id_token;
            access_token = datObj.access_token;
        }
        // if (typeof access_token === 'undefined' || access_token === null) {
        if (angular.isDefined(id_token) && id_token != null) {
            var isExpired = jwtHelper.isTokenExpired(id_token);
            console.log("id_token isExpired:" + isExpired);
            if (!isExpired) {
                isIdTokenValid = true;
            }
        }
        if (isIdTokenValid) {

            console.log("id_token ::::" + id_token);
            console.log("access_token ::::" + access_token);
            if (angular.isDefined(access_token) && access_token != null) {

                var userInfoData = oidcservce.getUserInfo(access_token).then(function (response) {
                        console.log("userInfo response:" + JSON.stringify(response));
                        $scope.userInfo = response.data
                        window.localStorage.setItem("userInfoData", JSON.stringify(response));
                    },
                    function (error) {
                        console.log("error:" + JSON.stringify(error));
                        window.localStorage.setItem("userInfoData", null);
                        //window.location.href = apUrl + "/index.html#login";
                    }
                );
                var tokenInfoData = oidcservce.getTokenInfo(access_token).then(function (response) {
                        console.log("tokenInfo response:" + JSON.stringify(response));
                        $scope.tokenInfo = response.data
                        window.localStorage.setItem("tokenInfoData", JSON.stringify(response));
                    },
                    function (error) {
                        console.log("error:" + JSON.stringify(error));
                        window.localStorage.setItem("tokenInfoData", null);
                        //window.location.href = apUrl + "/index.html#login";
                    }
                );
            }
        }
    }
    window.location.href = apUrl + "/index.html#userinfo";


});
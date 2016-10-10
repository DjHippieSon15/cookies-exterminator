let EXPORTED_SYMBOLS = ["Crusher"];

Components.utils.import("resource://gre/modules/Services.jsm");
//Components.utils.import("resource://gre/modules/Console.jsm");

let Crusher = function(Prefs, Buttons, Whitelist, Log, Notifications, Utils) {
	this.prepare = function(domain, cleanup) {
		if (!Prefs.getValue("suspendCrushing")) {
			let timestamp = Date.now();

			if (cleanup) {
				this.execute(domain, timestamp, cleanup);
			} else {
				Utils.setTimeout(this.execute.bind(this, domain, timestamp),
								 Prefs.getValue("crushingDelay"));
			}
		}
	};

	this.execute = function(domain, timestamp, cleanup) {
		if (cleanup) {
			this.executeForCookies(Services.cookies.enumerator, timestamp, cleanup);
		} else if (Prefs.getValue("keepCrushingThirdPartyCookies")) {
			this.executeForCookies(Services.cookies.enumerator, timestamp);
		} else if (typeof domain === "string") {
			this.executeForCookies(Services.cookies.getCookiesFromHost(domain), timestamp);
		} else if (domain.constructor === Array) {
			for (let currentDomain of domain) {
				this.executeForCookies(Services.cookies.getCookiesFromHost(currentDomain), timestamp);
			}
		}
	};

	this.executeForCookies = function(cookiesEnumerator, timestamp, cleanup) {
		let crushedSomething = false;
		let crushedCookiesDomains = {};

		while (cookiesEnumerator.hasMoreElements()) {
			let cookie = cookiesEnumerator.getNext().QueryInterface(Components.interfaces.nsICookie2);

//Components.utils.reportError("C: " + cookie.host);
			if (this.mayBeCrushed(cookie, timestamp, cleanup)) {
				if (typeof cookie.originAttributes === "object") {
					Services.cookies.remove(cookie.host, cookie.name, cookie.path, false, cookie.originAttributes);
				} else {
					Services.cookies.remove(cookie.host, cookie.name, cookie.path, false);
				}
				crushedSomething = true;
				crushedCookiesDomains[cookie.rawHost] = true;
			}
		}

		if (cleanup) {
			return;
		}

		if (crushedSomething) {
			let crushedCookiesDomainsString = "";

			for (let domain in crushedCookiesDomains) {
				crushedCookiesDomainsString += domain + ", ";
			}

			crushedCookiesDomainsString = crushedCookiesDomainsString.slice(0, -2);

			Buttons.notify(crushedCookiesDomainsString);
			Notifications.notify(crushedCookiesDomainsString);
			Log.log(crushedCookiesDomainsString); 
		} else {
			Buttons.notify();
		}
	};

	this.mayBeCrushed = function(cookie, timestamp, cleanup) {
		if (Whitelist.isWhitelisted(cookie.rawHost)) {
			return false;
		}

		if (cleanup) {
			return true;
		}

		let cookieLastAccessTimestamp = cookie.lastAccessed / 1000; // cut redundant 000

		if (cookieLastAccessTimestamp > timestamp ||
			Whitelist.isWhitelistedTemp(cookie.rawHost) ||
			(!Prefs.getValue("keepCrushingSessionCookies") && cookie.isSession)) {
			return false;
		}

		let windowsEnumerator = Services.wm.getEnumerator("navigator:browser");

		while (windowsEnumerator.hasMoreElements()) {
			let window = windowsEnumerator.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);
			let tabBrowser = window.gBrowser;

			for (let browser of tabBrowser.browsers) {
				let domain = browser.contentDocument.domain;
//				let domain = browser.contentDocument.location.host;

//console.log(browser.contentDocument);
//Components.utils.reportError("L: " + browser.contentDocument.location.host);

				if (domain) {
//				if (domain && domain != "") {

//Components.utils.reportError("?: " + domain);
					if (cookie.rawHost == domain ||
							cookie.isDomain && cookie.rawHost == domain.substring(domain.indexOf(".") + 1)) {
						return false;
					}

					if (Prefs.getValue("keepCrushingLocalStorage")) {
						let storage = browser.contentWindow.localStorage;
//						let storage = null;
//						try {
//							storage = browser.contentWindow.localStorage;
//						} catch(e) {}

						if (storage) {
							storage.clear();
						}
					}
				}
			}
		}

		return true;
	};
};

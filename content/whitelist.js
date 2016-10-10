let EXPORTED_SYMBOLS = ["Whitelist"];

let Whitelist = function(Prefs) {
	this.domains = {};
	this.domainsTemp = {};

	this.init = function() {
		this.loadFromPrefs();
	};

	this.loadFromPrefs = function() {
		this.domains = {};
		this.domainsTemp = {};

		let whitelistedDomains = Prefs.getValue("whitelistedDomains");

		if (whitelistedDomains != "") {
			let separatedDomains = whitelistedDomains.split(';');
			
			for (let domain of separatedDomains) {
				this.domains[domain] = true;
			}
		}

		let whitelistedDomainsTemp = Prefs.getValue("whitelistedDomainsTemp");

		if (whitelistedDomainsTemp != "") {
			let separatedDomainsTemp = whitelistedDomainsTemp.split(';');

			for (let domain of separatedDomainsTemp) {
				this.domainsTemp[domain] = true;
			}
		}
	};

	this.saveToPrefs = function(domains, prefname) {
		let whitelistedDomains = "";

		for (let domain in domains) {
			if (domains[domain]) {
				whitelistedDomains += domain + ";";
			}
		}

		whitelistedDomains = whitelistedDomains.slice(0, -1);

		Prefs.setValue(prefname, whitelistedDomains);
		Prefs.save();
	};

	this.addDomain = function(domain) {
		this.domains[domain] = true;
		this.saveToPrefs(this.domains, "whitelistedDomains");
	};

	this.addDomainTemp = function(domain) {
		this.domainsTemp[domain] = true;
		this.saveToPrefs(this.domainsTemp, "whitelistedDomainsTemp");
	};

	this.removeDomain = function(domain) {
		this.domains[domain] = undefined;
		this.saveToPrefs(this.domains, "whitelistedDomains");
	};

	this.removeDomainTemp = function(domain) {
		this.domainsTemp[domain] = undefined;
		this.saveToPrefs(this.domainsTemp, "whitelistedDomainsTemp");
	};

	this.isWhitelisted = function(domain) {
		return this.domains[domain] || this.checkForWildcard(domain, this.domains);
	};

	this.isWhitelistedTemp = function(domain) {
		return this.domainsTemp[domain] || this.checkForWildcard(domain, this.domainsTemp);
	};

	this.checkForWildcard = function(domain, domains) {
		if (typeof domain === "string") {
			while (domain.indexOf(".") != -1) {
				domain = domain.substring(domain.indexOf(".") + 1);
				if (domain.indexOf(".") != -1 && domains[domain]) {
					return domain;
				}
			}
		}

		return null;
	};

	this.onPrefsApply = function() {
		this.loadFromPrefs();
	};
};

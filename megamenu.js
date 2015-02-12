Type.registerNamespace("PRFT.Megamenu");

$(document).ready(function () {
    // SharePoint adds CDATA escapes when you save master page
    $("script[type='text/html']").each(function () {
        var template = $(this);
        if (template.text() == "") {
            this.text = this.text.replace('//<![CDATA[', '').replace('//]]>', '');
        }
        else {
            template.text(template.text().replace('//<![CDATA[', '').replace('//]]>', ''));
        }
    });
});

PRFT.Megamenu.Navigation = {
    QuickLinks: [],
    QuickLinks2: [],
    QuickLinks3: [],
    SuiteLinks: [],
    MegaMenu: [],
    Load: function (ctx, enumerator, linkType) {

        while (enumerator.moveNext()) {
            var oTerm = enumerator.get_current();
            var node = new PRFT.Megamenu.NavigationNode();
            node.Title = oTerm.get_name();
            var urlValue = oTerm.get_localCustomProperties()['_Sys_Nav_SimpleLinkUrl'];
            node.NodeUrl = urlValue ? urlValue : "#";
            var bOpenInNewWindow = oTerm.get_localCustomProperties()['OpenInNewWindow'];
            node.OpenInNewWindow = bOpenInNewWindow ? "_blank" : "";
            node.subTerms = oTerm.get_terms();
            ctx.load(node.subTerms);
            this[linkType].push(node);
        }
    },
    LoadLevelTwo: function (ctx, enumerator, linkType, parrentNode) {
        this[linkType][parrentNode].subNodes = [];
        while (enumerator.moveNext()) {
            var oTerm = enumerator.get_current();
            var node = new PRFT.Megamenu.NavigationNode();
            node.Title = oTerm.get_name();
            var urlValue = oTerm.get_localCustomProperties()['_Sys_Nav_SimpleLinkUrl'];
            node.NodeUrl = urlValue ? urlValue : "#";
            var bViewAllBar = oTerm.get_localCustomProperties()['ViewAllBar'];
            node.ViewAllBar = bViewAllBar ? true : false;
            var bOpenInNewWindow = oTerm.get_localCustomProperties()['OpenInNewWindow'];
            node.OpenInNewWindow = bOpenInNewWindow ? "_blank" : "";
            node.Column = oTerm.get_localCustomProperties()['column'] ? oTerm.get_localCustomProperties()['column'] : 1;
            node.subTerms = oTerm.get_terms();
            ctx.load(node.subTerms);
            this[linkType][parrentNode].subNodes.push(node);
        }
    },
    LoadLevelThree: function (ctx, enumerator, linkType, parrentNode, subNode, col) {
        this[linkType][parrentNode].subNodes[subNode].subNodes = [];
        while (enumerator.moveNext()) {
            var oTerm = enumerator.get_current();
            var node = new PRFT.Megamenu.NavigationNode();
            node.Title = oTerm.get_name();
            var urlValue = oTerm.get_localCustomProperties()['_Sys_Nav_SimpleLinkUrl'];
            node.NodeUrl = urlValue ? urlValue : "#";
            var bViewAllBar = oTerm.get_localCustomProperties()['ViewAllBar'];
            node.ViewAllBar = bViewAllBar ? true : false;
            var bOpenInNewWindow = oTerm.get_localCustomProperties()['OpenInNewWindow'];
            node.OpenInNewWindow = bOpenInNewWindow ? "_blank" : "";
            node.Column = oTerm.get_localCustomProperties()['column'] ? oTerm.get_localCustomProperties()['column'] : col;
            node.subTerms = oTerm.get_terms();
            ctx.load(node.subTerms);
            this[linkType][parrentNode].subNodes[subNode].subNodes.push(node);
        }
    },
    ProcessLevelTwo: function (ctx, linkType) {
        for (var i = 0; i < this[linkType].length; i++) {
            this.LoadLevelTwo(ctx, this[linkType][i].subTerms.getEnumerator(), linkType, i);
            this[linkType][i].subTerms = []; //cleaning up sp.taxonomy objects so JSON.stringify will work
        }
    },
    ProcessLevelThree: function (ctx, linkType) {
        for (var i = 0; i < this[linkType].length; i++) {
            for (var j = 0; j < this[linkType][i].subNodes.length; j++) {
                this.LoadLevelThree(ctx, this[linkType][i].subNodes[j].subTerms.getEnumerator(), linkType, i, j, this[linkType][i].subNodes[j].Column);
                this[linkType][i].subNodes[j].subTerms = []; //cleaning up sp.taxonomy objects so JSON.stringify will work
            }
        }
    }

};

PRFT.Megamenu.NavigationNode = function () {
    this.Tile = "";
    this.NodeUrl = "";
    this.HideInFooter = true;
    this.OpenInNewWindow = false;
    this.Column = 1;
}

PRFT.Megamenu.SetupNavigation = function () {

    if (false) {//typeof (Storage) !== "undefined" && localStorage.Megamenu_navigation && (new Date(localStorage.Megamenu_navigation_expiration) > new Date())) {

        PRFT.Megamenu.Navigation = JSON.parse(localStorage.Megamenu_navigation);
        ko.applyBindings(PRFT.Megamenu.Navigation, $('.TopNavigationBar')[0]);
        ko.applyBindings(PRFT.Megamenu.Navigation, $('#footer')[0]);

    } else {

        SP.SOD.registerSod('sp.taxonomy.js', '/_layouts/15/sp.taxonomy.js');
        EnsureScriptFunc("sp.js", "SP.ClientContext", function () {
            EnsureScriptFunc("sp.taxonomy.js", "SP.Taxonomy", function () {
                var clientContext = SP.ClientContext.get_current();
                var oWebsite = clientContext.get_web();

                var taxonomySession = SP.Taxonomy.TaxonomySession.getTaxonomySession(clientContext);
                var termStore = taxonomySession.get_termStores().getByName("Managed Metadata - Service");

                var quickLinksTermSet = termStore.getTermSet("f288d9a4-5155-4989-bc9a-3f0cd210fba4"); // quick links 1
                var quickLinksTerms = quickLinksTermSet.getAllTerms();
                clientContext.load(quickLinksTerms);

                var quickLinks2TermSet = termStore.getTermSet("fdf35d9b-5b58-432b-bf01-0c60f75f5d41"); // quick links 2
                var quickLinks2Terms = quickLinks2TermSet.getAllTerms();
                clientContext.load(quickLinks2Terms);

                var quickLinks3TermSet = termStore.getTermSet("00341998-e05f-4df0-a769-1bcfb5c859c0"); // quick links 3
                var quickLinks3Terms = quickLinks3TermSet.getAllTerms();
                clientContext.load(quickLinks3Terms);

                var megaMenuTermSet = termStore.getTermSet("22668f44-4455-45a8-bf95-de125be08fa5"); //mega menu
                var megaMenuTerms = megaMenuTermSet.get_terms();
                clientContext.load(megaMenuTerms);

                clientContext.executeQueryAsync(function () {
                    PRFT.Megamenu.Navigation.Load(clientContext, megaMenuTerms.getEnumerator(), "MegaMenu");
                    PRFT.Megamenu.Navigation.Load(clientContext, quickLinksTerms.getEnumerator(), "QuickLinks");
                    PRFT.Megamenu.Navigation.Load(clientContext, quickLinks2Terms.getEnumerator(), "QuickLinks2");
                    PRFT.Megamenu.Navigation.Load(clientContext, quickLinks3Terms.getEnumerator(), "QuickLinks3");

                    clientContext.executeQueryAsync(function () {
                        PRFT.Megamenu.Navigation.ProcessLevelTwo(clientContext, "MegaMenu");
                        PRFT.Megamenu.Navigation.ProcessLevelTwo(clientContext, "QuickLinks");
                        PRFT.Megamenu.Navigation.ProcessLevelTwo(clientContext, "QuickLinks2");
                        PRFT.Megamenu.Navigation.ProcessLevelTwo(clientContext, "QuickLinks3");
                        
                        clientContext.executeQueryAsync(function () {
                            PRFT.Megamenu.Navigation.ProcessLevelThree(clientContext, "MegaMenu");
                            PRFT.Megamenu.Navigation.ProcessLevelThree(clientContext, "QuickLinks");
                            PRFT.Megamenu.Navigation.ProcessLevelThree(clientContext, "QuickLinks2");
                            PRFT.Megamenu.Navigation.ProcessLevelThree(clientContext, "QuickLinks3");

                            ko.applyBindings(PRFT.Megamenu.Navigation, $('.TopNavigationBar')[0]);
                            ko.applyBindings(PRFT.Megamenu.Navigation, $('#footer')[0]);
                            localStorage.Megamenu_navigation = JSON.stringify(PRFT.Megamenu.Navigation);
                            localStorage.Megamenu_navigation_expiration = new Date(new Date().getTime() + 30 * 60000);
                        });

                    },
                    function (sender, args) {
                        console.error('Request failed. ' + args.get_message() + '\n' + args.get_stackTrace());
                    });
                },
                function (sender, args) {
                    console.error('Request failed. ' + args.get_message() + '\n' + args.get_stackTrace());
                });
            });
        });
    }
};


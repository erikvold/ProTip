window.addEventListener("message", function (event) {
    // We only accept messages from ourselves
    if (event.source != window) {
        return;
    }

    chrome.runtime.sendMessage({
        action: event.data.action,
        bitcoinAddress: event.data.bitcoinAddress,
        url: document.URL,
        title: document.title
     });
}, false);

var port = chrome.runtime.connect();

if(document.URL.match(/http/)){ // only send http or https urls no chrome:// type addresses.

    chrome.runtime.sendMessage({action: 'isBlacklisted', url:document.URL});
    chrome.runtime.sendMessage({action: 'isStarredUser', url:document.URL});

    chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
        if (request.method == 'isBlacklisted' && request.response == false){
            // If the isBlackedlisted function returns false.
            scanText();
            scanLinks();
            // (1) All found bitcoin address found in the links and text are tagged with
            // the green bordered UI.
            // (2) We loop over all tagged elements and check and submit the
            // correctly prioritized found bitcoin address.
            selectPrioritizedBitcoinAddress({knownBTCAddress: request.knownBTCAddress});
        } else if (request.method == 'isStarredUser' && request.response == true){
            starredUser();
        } // else page is blacklisted and no need to scan anything.
    });
}

function selectPrioritizedBitcoinAddress(options){
  // There may be many BTC addresses on the page. We can only record one address
  // The order of priority is (1) knownBTCAddress > (2) Metatags > (3) Links > (4) Text
  var firstFoundLinkBitcoinAddress = document.getElementsByClassName('protip-link')[0];
  var firstFoundTextBitcoinAddress = document.getElementsByClassName('protip-text')[0];


  //if ( options && scanMetatags().trim() == options.knownBTCAddress.trim()){
      // ***Special Case***, if there is an address in the metatag but it is also previously known
      // for this url display "META" instead of the first 4 characters of the previously known
      // address in the chrome extension icon.
      // Otherwise people don't think that Protip is detecting the metatag btc address.
  //} else
  if(options && options.knownBTCAddress) {
      // (1) Highlight known bitcoin address
      recordAndHighlightBitcoinAddress(options.knownBTCAddress)
  } else if (scanMetatags()){
      // (2) Don't select any bitcoin addresses.
  } else if (firstFoundLinkBitcoinAddress) {
      // (3) Highlight the first found Link bitcoin address
      recordAndHighlightBitcoinAddress(firstFoundLinkBitcoinAddress.getAttribute('data-protip-btc-address'));
  } else if (firstFoundTextBitcoinAddress) {
      // (4) Highlight the first found Text bitcoin address
      recordAndHighlightBitcoinAddress(firstFoundTextBitcoinAddress.getAttribute('data-protip-btc-address'));
  }
}

function scanLinks() {
    var matchedLinks = [];
    var links = document.links;
    for ( i = 0; i < links.length; i++ ) {

        // The standard for most third party software such as tipping services and wallets.
        // <a href="bitcoin:1ProTip9x3uoqKDJeMQJdQUCQawDLauNiF">foo</a>
        var match = links[i].href.match(/bitcoin:([13][a-km-zA-HJ-NP-Z0-9]{26,33})/i);
        var btcAddress = '';

        if ( match ) {
            btcAddress = match[1];
        } else if ( links[i].text && !match ) { // check "links[i].text" because <area shape="rect" ... href="/150/"> is a link

            // Allow for this type of bitcoin link, the text only contains the BTC Address
            // <a href="https://blockchain.info/address/1B9c5V8Fc89qCKKznWUGh1vAxDh3RstqgC">
            //    1B9c5V8Fc89qCKKznWUGh1vAxDh3RstqgC
            // </a>
            match = links[i].text.trim().match(/(^|\\s)[13][a-km-zA-HJ-NP-Z0-9]{26,33}($|\\s)/i);
            if ( match ) {
                btcAddress = match[0];
            }
        }

        if ( btcAddress && validAddress(btcAddress) ) {
            matchedLinks.push();
            var span = tagElementWithProTipUI(btcAddress, 'protip-link');
            links[i].parentElement.insertBefore(span, links[i]);
            span.appendChild(links[i]);
        }
    }
}

function scanText(){
    var regex = new RegExp("(^|\\s)[13][a-km-zA-HJ-NP-Z0-9]{26,33}($|\\s)", "g");

    matchText(document.body, regex, function (node, match) {

        var words = node.textContent.split(' ');
        var parent_span = document.createElement("span");
        for ( i = 0; i < words.length; i++ ) {
            if(validAddress(words[i].trim())){
                var span = tagElementWithProTipUI(words[i], 'protip-text')
                var content_span = document.createElement("span")
                content_span.textContent = words[i];
                span.appendChild(content_span);
                parent_span.appendChild(span);
            } else {
                var span = document.createElement("span");
                span.textContent = words[i] + ' ';
                parent_span.appendChild(span);
            }
        }
        node.parentElement.replaceChild(parent_span, node);
    });
}

var matchText = function(node, regex, callback, excludeElements) {

    excludeElements || (excludeElements = ['script', 'img', 'style', 'iframe', 'canvas', 'a']); // exclude 'a' links search separately
    var child = node.firstChild;

    do {
        switch (child.nodeType) {
        case 1:
            if (excludeElements.indexOf(child.tagName.toLowerCase()) > -1) {
                continue;
            }
            // Weird hack, running scanLinks() prior to matchText messes up the reference to child.firstChild
            // Maybe something to do with the moving the newly created elements post loading... Really not sure
            if(child.firstChild){ //
                matchText(child, regex, callback, excludeElements);
            }
            break;
        case 3:
            if(regex.test(child.data)){
              callback.apply(window, [child]);
            }
            break;
        }
    } while (child = child.nextSibling);

    return node;
}

function scanMetatags(){
    //<meta name="microtip" content="1PvxNMqU29vRj8k5EVKsQEEfc84rS1Br3b" data-currency="btc">
    var metatags = document.getElementsByTagName('meta');
    for ( i = 0; i < metatags.length; i++ ) {
        if( metatags[i].name == 'microtip' && validAddress(metatags[i].content) ) {
            chrome.runtime.sendMessage({
                source: 'metatag',
                action: "putBitcoinAddress",
                bitcoinAddress: metatags[i].content,
                title: document.title,
                url: document.URL
            });
            return metatags[i].content // only get the first instance of a microtip metatag.
        }
    }
    return false;
}

function tagElementWithProTipUI(match, klass_name){
    if(!klass_name){ // default
        klass_name ='protip'
    }

    var span = document.createElement("span");
    span.style.padding = '0px';
    span.style.borderRadius = '2px';
    span.style.display = 'inline-flex';
    span.className = klass_name;
    //span.id = match;
    span.setAttribute('data-protip-btc-address', match);
    span.style.border = 'solid 1px #7FE56F';

    // Create and add the checkbox.
    var checkbox = document.createElement("input");
    checkbox.type = 'checkbox';
    checkbox.className = 'protip-checkbox';
    checkbox.id = 'protip-checkbox-' + match;
    checkbox.addEventListener("click",
        function () {
            if( this.checked ) { // state changed before 'click' is fired
                window.postMessage(
                    {
                        action: "putBitcoinAddress",
                        bitcoinAddress: this.parentElement.getAttribute('data-protip-btc-address')
                    }, "*"
                );
                ensureSingleSelectionOfCheckbox(this.parentElement.getAttribute('data-protip-btc-address'));
            } else {
                window.postMessage(
                    { action: "deleteBitcoinAddress" }, "*"
                );
                this.parentElement.style.backgroundColor = 'transparent';
            }
        }, false
    );

    span.insertBefore(checkbox, span.firstChild);

    return span;
}

function recordAndHighlightBitcoinAddress(btcAddress){
  chrome.runtime.sendMessage({
      action: 'putBitcoinAddress',
      bitcoinAddress: btcAddress,
      title: document.title,
      url: document.URL
  });
  ensureSingleSelectionOfCheckbox(btcAddress);
}

function ensureSingleSelectionOfCheckbox(selectedBTCAddress){
    // Makes the checkboxes act similar to radio buttons.
    //
    // I care alot about UI design, so why break default
    // UI behavior?
    //
    // Only one BTC address can recorded per URL. A
    // one-to-one relationship.
    //
    // User testing revealed that the first found BTC address
    // is almost always the correct BTC address to record.
    //
    // Edge cases in order of priority:
    // #1 Remove a BTC address such that no BTC address is
    //    recorded for the URL.
    // #2 Swap the recorded BTC address for a another found
    //    further down the page. Rare, but users want to know
    //    they have the option.
    //
    // Typically, this would be done with a combination of
    // checkbox and radio buttons.
    //
    // My reasons for breaking default checkbox UI behavour:
    // #1 Limited UI real estate in unconventional places.
    // #2 The radio buttons work best when promixal to each
    //    other. The highlighted BTC addresses are potentially
    //    distributed throughout the whole page.
    // #3 Edge Case #1 takes priority over Edge Case #2
    //
    // Will see how user testing proceeds. :).
    els = document.getElementsByClassName('protip-checkbox');
    for ( i = 0; i < els.length; i++ ) {
        if ( els[i].id == 'protip-checkbox-' + selectedBTCAddress ) {
            els[i].checked = true;
            els[i].parentElement.style.backgroundColor = '#7FE56F';
        } else {
            els[i].checked = false;
            els[i].parentElement.style.border = 'solid 1px #7FE56F';
            els[i].parentElement.style.backgroundColor = 'transparent';
        }
    }
}

function starredUser(){
    var twitterUserContainer = document.getElementsByClassName('ProfileHeaderCard-name')[0];
    var span = document.createElement("span");
    span.style.backgroundColor = '#7FE56F';

    //Code for displaying <extensionDir>/images/myimage.png:
    var imgURL = chrome.extension.getURL("./assets/images/star.png");
    var img = document.createElement("img");
    img.setAttribute("src", imgURL);

    span.style.padding = '5px';
    span.style.marginLeft = '6px';
    span.style.position = 'relative';
    span.style.fontSize = '10px';
    span.style.top = '-3px';
    span.style.borderRadius = '2px';
    span.style.display = 'inline-flex';
    span.innerText = 'ProTip Sponsor';

    twitterUserContainer.appendChild(img);
    twitterUserContainer.appendChild(span);
}


if (!Array.prototype.indexOf)
{
  Array.prototype.indexOf = function(elt /*, from*/)
  {
    var len = this.length >>> 0;

    var from = Number(arguments[1]) || 0;
    from = (from < 0)
         ? Math.ceil(from)
         : Math.floor(from);
    if (from < 0)
      from += len;

    for (; from < len; from++)
    {
      if (from in this &&
          this[from] === elt)
        return from;
    }
    return -1;
  };
}

if( typeof String.prototype.trim !== 'function' ) {
  String.prototype.trim = function() {
    //Your implementation here. Might be worth looking at perf comparison at
    //http://blog.stevenlevithan.com/archives/faster-trim-javascript
    //
    //The most common one is perhaps this:
    return this.replace(/^\s+|\s+$/g, ''); 
  }
}
var defaultDiacriticsRemovalMap = [
    {'base':'A', 'letters':/[\u0041\u24B6\uFF21\u00C0\u00C1\u00C2\u1EA6\u1EA4\u1EAA\u1EA8\u00C3\u0100\u0102\u1EB0\u1EAE\u1EB4\u1EB2\u0226\u01E0\u00C4\u01DE\u1EA2\u00C5\u01FA\u01CD\u0200\u0202\u1EA0\u1EAC\u1EB6\u1E00\u0104\u023A\u2C6F]/g},
    {'base':'AA','letters':/[\uA732]/g},
    {'base':'AE','letters':/[\u00C6\u01FC\u01E2]/g},
    {'base':'AO','letters':/[\uA734]/g},
    {'base':'AU','letters':/[\uA736]/g},
    {'base':'AV','letters':/[\uA738\uA73A]/g},
    {'base':'AY','letters':/[\uA73C]/g},
    {'base':'B', 'letters':/[\u0042\u24B7\uFF22\u1E02\u1E04\u1E06\u0243\u0182\u0181]/g},
    {'base':'C', 'letters':/[\u0043\u24B8\uFF23\u0106\u0108\u010A\u010C\u00C7\u1E08\u0187\u023B\uA73E]/g},
    {'base':'D', 'letters':/[\u0044\u24B9\uFF24\u1E0A\u010E\u1E0C\u1E10\u1E12\u1E0E\u0110\u018B\u018A\u0189\uA779]/g},
    {'base':'DZ','letters':/[\u01F1\u01C4]/g},
    {'base':'Dz','letters':/[\u01F2\u01C5]/g},
    {'base':'E', 'letters':/[\u0045\u24BA\uFF25\u00C8\u00C9\u00CA\u1EC0\u1EBE\u1EC4\u1EC2\u1EBC\u0112\u1E14\u1E16\u0114\u0116\u00CB\u1EBA\u011A\u0204\u0206\u1EB8\u1EC6\u0228\u1E1C\u0118\u1E18\u1E1A\u0190\u018E]/g},
    {'base':'F', 'letters':/[\u0046\u24BB\uFF26\u1E1E\u0191\uA77B]/g},
    {'base':'G', 'letters':/[\u0047\u24BC\uFF27\u01F4\u011C\u1E20\u011E\u0120\u01E6\u0122\u01E4\u0193\uA7A0\uA77D\uA77E]/g},
    {'base':'H', 'letters':/[\u0048\u24BD\uFF28\u0124\u1E22\u1E26\u021E\u1E24\u1E28\u1E2A\u0126\u2C67\u2C75\uA78D]/g},
    {'base':'I', 'letters':/[\u0049\u24BE\uFF29\u00CC\u00CD\u00CE\u0128\u012A\u012C\u0130\u00CF\u1E2E\u1EC8\u01CF\u0208\u020A\u1ECA\u012E\u1E2C\u0197]/g},
    {'base':'J', 'letters':/[\u004A\u24BF\uFF2A\u0134\u0248]/g},
    {'base':'K', 'letters':/[\u004B\u24C0\uFF2B\u1E30\u01E8\u1E32\u0136\u1E34\u0198\u2C69\uA740\uA742\uA744\uA7A2]/g},
    {'base':'L', 'letters':/[\u004C\u24C1\uFF2C\u013F\u0139\u013D\u1E36\u1E38\u013B\u1E3C\u1E3A\u0141\u023D\u2C62\u2C60\uA748\uA746\uA780]/g},
    {'base':'LJ','letters':/[\u01C7]/g},
    {'base':'Lj','letters':/[\u01C8]/g},
    {'base':'M', 'letters':/[\u004D\u24C2\uFF2D\u1E3E\u1E40\u1E42\u2C6E\u019C]/g},
    {'base':'N', 'letters':/[\u004E\u24C3\uFF2E\u01F8\u0143\u00D1\u1E44\u0147\u1E46\u0145\u1E4A\u1E48\u0220\u019D\uA790\uA7A4]/g},
    {'base':'NJ','letters':/[\u01CA]/g},
    {'base':'Nj','letters':/[\u01CB]/g},
    {'base':'O', 'letters':/[\u004F\u24C4\uFF2F\u00D2\u00D3\u00D4\u1ED2\u1ED0\u1ED6\u1ED4\u00D5\u1E4C\u022C\u1E4E\u014C\u1E50\u1E52\u014E\u022E\u0230\u00D6\u022A\u1ECE\u0150\u01D1\u020C\u020E\u01A0\u1EDC\u1EDA\u1EE0\u1EDE\u1EE2\u1ECC\u1ED8\u01EA\u01EC\u00D8\u01FE\u0186\u019F\uA74A\uA74C]/g},
    {'base':'OI','letters':/[\u01A2]/g},
    {'base':'OO','letters':/[\uA74E]/g},
    {'base':'OU','letters':/[\u0222]/g},
    {'base':'P', 'letters':/[\u0050\u24C5\uFF30\u1E54\u1E56\u01A4\u2C63\uA750\uA752\uA754]/g},
    {'base':'Q', 'letters':/[\u0051\u24C6\uFF31\uA756\uA758\u024A]/g},
    {'base':'R', 'letters':/[\u0052\u24C7\uFF32\u0154\u1E58\u0158\u0210\u0212\u1E5A\u1E5C\u0156\u1E5E\u024C\u2C64\uA75A\uA7A6\uA782]/g},
    {'base':'S', 'letters':/[\u0053\u24C8\uFF33\u1E9E\u015A\u1E64\u015C\u1E60\u0160\u1E66\u1E62\u1E68\u0218\u015E\u2C7E\uA7A8\uA784]/g},
    {'base':'T', 'letters':/[\u0054\u24C9\uFF34\u1E6A\u0164\u1E6C\u021A\u0162\u1E70\u1E6E\u0166\u01AC\u01AE\u023E\uA786]/g},
    {'base':'TZ','letters':/[\uA728]/g},
    {'base':'U', 'letters':/[\u0055\u24CA\uFF35\u00D9\u00DA\u00DB\u0168\u1E78\u016A\u1E7A\u016C\u00DC\u01DB\u01D7\u01D5\u01D9\u1EE6\u016E\u0170\u01D3\u0214\u0216\u01AF\u1EEA\u1EE8\u1EEE\u1EEC\u1EF0\u1EE4\u1E72\u0172\u1E76\u1E74\u0244]/g},
    {'base':'V', 'letters':/[\u0056\u24CB\uFF36\u1E7C\u1E7E\u01B2\uA75E\u0245]/g},
    {'base':'VY','letters':/[\uA760]/g},
    {'base':'W', 'letters':/[\u0057\u24CC\uFF37\u1E80\u1E82\u0174\u1E86\u1E84\u1E88\u2C72]/g},
    {'base':'X', 'letters':/[\u0058\u24CD\uFF38\u1E8A\u1E8C]/g},
    {'base':'Y', 'letters':/[\u0059\u24CE\uFF39\u1EF2\u00DD\u0176\u1EF8\u0232\u1E8E\u0178\u1EF6\u1EF4\u01B3\u024E\u1EFE]/g},
    {'base':'Z', 'letters':/[\u005A\u24CF\uFF3A\u0179\u1E90\u017B\u017D\u1E92\u1E94\u01B5\u0224\u2C7F\u2C6B\uA762]/g},
    {'base':'a', 'letters':/[\u0061\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u00E4\u01DF\u1EA3\u00E5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250]/g},
    {'base':'aa','letters':/[\uA733]/g},
    {'base':'ae','letters':/[\u00E6\u01FD\u01E3]/g},
    {'base':'ao','letters':/[\uA735]/g},
    {'base':'au','letters':/[\uA737]/g},
    {'base':'av','letters':/[\uA739\uA73B]/g},
    {'base':'ay','letters':/[\uA73D]/g},
    {'base':'b', 'letters':/[\u0062\u24D1\uFF42\u1E03\u1E05\u1E07\u0180\u0183\u0253]/g},
    {'base':'c', 'letters':/[\u0063\u24D2\uFF43\u0107\u0109\u010B\u010D\u00E7\u1E09\u0188\u023C\uA73F\u2184]/g},
    {'base':'d', 'letters':/[\u0064\u24D3\uFF44\u1E0B\u010F\u1E0D\u1E11\u1E13\u1E0F\u0111\u018C\u0256\u0257\uA77A]/g},
    {'base':'dz','letters':/[\u01F3\u01C6]/g},
    {'base':'e', 'letters':/[\u0065\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD]/g},
    {'base':'f', 'letters':/[\u0066\u24D5\uFF46\u1E1F\u0192\uA77C]/g},
    {'base':'g', 'letters':/[\u0067\u24D6\uFF47\u01F5\u011D\u1E21\u011F\u0121\u01E7\u0123\u01E5\u0260\uA7A1\u1D79\uA77F]/g},
    {'base':'h', 'letters':/[\u0068\u24D7\uFF48\u0125\u1E23\u1E27\u021F\u1E25\u1E29\u1E2B\u1E96\u0127\u2C68\u2C76\u0265]/g},
    {'base':'hv','letters':/[\u0195]/g},
    {'base':'i', 'letters':/[\u0069\u24D8\uFF49\u00EC\u00ED\u00EE\u0129\u012B\u012D\u00EF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131]/g},
    {'base':'j', 'letters':/[\u006A\u24D9\uFF4A\u0135\u01F0\u0249]/g},
    {'base':'k', 'letters':/[\u006B\u24DA\uFF4B\u1E31\u01E9\u1E33\u0137\u1E35\u0199\u2C6A\uA741\uA743\uA745\uA7A3]/g},
    {'base':'l', 'letters':/[\u006C\u24DB\uFF4C\u0140\u013A\u013E\u1E37\u1E39\u013C\u1E3D\u1E3B\u017F\u0142\u019A\u026B\u2C61\uA749\uA781\uA747]/g},
    {'base':'lj','letters':/[\u01C9]/g},
    {'base':'m', 'letters':/[\u006D\u24DC\uFF4D\u1E3F\u1E41\u1E43\u0271\u026F]/g},
    {'base':'n', 'letters':/[\u006E\u24DD\uFF4E\u01F9\u0144\u00F1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5]/g},
    {'base':'nj','letters':/[\u01CC]/g},
    {'base':'o', 'letters':/[\u006F\u24DE\uFF4F\u00F2\u00F3\u00F4\u1ED3\u1ED1\u1ED7\u1ED5\u00F5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\u00F6\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\u00F8\u01FF\u0254\uA74B\uA74D\u0275]/g},
    {'base':'oi','letters':/[\u01A3]/g},
    {'base':'ou','letters':/[\u0223]/g},
    {'base':'oo','letters':/[\uA74F]/g},
    {'base':'p','letters':/[\u0070\u24DF\uFF50\u1E55\u1E57\u01A5\u1D7D\uA751\uA753\uA755]/g},
    {'base':'q','letters':/[\u0071\u24E0\uFF51\u024B\uA757\uA759]/g},
    {'base':'r','letters':/[\u0072\u24E1\uFF52\u0155\u1E59\u0159\u0211\u0213\u1E5B\u1E5D\u0157\u1E5F\u024D\u027D\uA75B\uA7A7\uA783]/g},
    {'base':'s','letters':/[\u0073\u24E2\uFF53\u00DF\u015B\u1E65\u015D\u1E61\u0161\u1E67\u1E63\u1E69\u0219\u015F\u023F\uA7A9\uA785\u1E9B]/g},
    {'base':'t','letters':/[\u0074\u24E3\uFF54\u1E6B\u1E97\u0165\u1E6D\u021B\u0163\u1E71\u1E6F\u0167\u01AD\u0288\u2C66\uA787]/g},
    {'base':'tz','letters':/[\uA729]/g},
    {'base':'u','letters':/[\u0075\u24E4\uFF55\u00F9\u00FA\u00FB\u0169\u1E79\u016B\u1E7B\u016D\u00FC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289]/g},
    {'base':'v','letters':/[\u0076\u24E5\uFF56\u1E7D\u1E7F\u028B\uA75F\u028C]/g},
    {'base':'vy','letters':/[\uA761]/g},
    {'base':'w','letters':/[\u0077\u24E6\uFF57\u1E81\u1E83\u0175\u1E87\u1E85\u1E98\u1E89\u2C73]/g},
    {'base':'x','letters':/[\u0078\u24E7\uFF58\u1E8B\u1E8D]/g},
    {'base':'y','letters':/[\u0079\u24E8\uFF59\u1EF3\u00FD\u0177\u1EF9\u0233\u1E8F\u00FF\u1EF7\u1E99\u1EF5\u01B4\u024F\u1EFF]/g},
    {'base':'z','letters':/[\u007A\u24E9\uFF5A\u017A\u1E91\u017C\u017E\u1E93\u1E95\u01B6\u0225\u0240\u2C6C\uA763]/g}
];

var changes;
function removeDiacritics (str) {
    if(!changes) {
        changes = defaultDiacriticsRemovalMap;
    }
    for(var i=0; i<changes.length; i++) {
        str = str.replace(changes[i].letters, changes[i].base);
    }
    return str;
}

 var descriptorsuggestionEl = did('searchsuggestions'); 
 var descriptorinSuggest = false;
 var gkUp = 38, gkDown = 40, gkEnter = 13, gkEsc = 27;
 var descriptorsuggestions = new Array('16-bit', '2-step', '2 tone', '\'ote\'a', '3-step', 'aak', 'abakuá music', 'abkhazian folk music', 'aboio', 'aboio cantado', 'abstract hip hop', 'a cappella', 'acholi music', 'acholitronix', 'achomi music', 'acid breaks', 'acidcore', 'acid house', 'acid jazz', 'acid rock', 'acid techno', 'acid trance', 'acousmatic music', 'acoustic blues', 'acoustic chicago blues', 'acoustic rock', 'acoustic texas blues', 'adhunik geet', 'adult contemporary', 'aegean islands folk music', 'afar music', 'afoxé', 'african folk music', 'african music', 'afrikaner folk music', 'afrobeat', 'afrobeats', 'afro-cuban jazz', 'afro-funk', 'afrofuturism', 'afro house', 'afro-jazz', 'afropiano', 'afro-rock', 'afroswing', 'afro trap', 'agbadza', 'agbekor', 'aggrotech', 'agronejo', 'ahwash', 'ainu music', 'aita', 'akan music', 'akishibu-kei', 'akron sound', 'albanian folk music', 'aleke', 'alevi folk music', 'algerian chaabi', 'algorave', 'al-jadīd', 'alloukou', 'alpenrock', 'alpine folk music', 'alsatian folk music', 'altai music', 'alt-country', 'alté', 'alternative dance', 'alternative idol', 'alternative metal', 'alternative r&b', 'alternative rock', 'alt-pop', 'amami shimauta', 'amapiano', 'amazigh music', 'ambasse bey', 'ambient', 'ambient americana', 'ambient dub', 'ambient house', 'ambient noise wall', 'ambient plugg', 'ambient pop', 'ambient techno', 'ambient trance', 'ambrosian chant', 'americana', 'american folk music', 'american gamelan', 'american primitivism', 'amigacore', 'anarcho-punk', 'anatolian rock', 'ancient chinese music', 'ancient egyptian music', 'ancient greek music', 'ancient levitical music', 'ancient music', 'ancient roman music', 'andalusian classical music', 'andalusian folk music', 'andean new age', 'anglican chant', 'animal sounds', 'anti-folk', 'aor', 'apala', 'appalachian folk music', 'aquacrunk', 'arabesk', 'arabesque rap', 'arabic bellydance music', 'arabic classical music', 'arabic folk music', 'arabic jazz', 'arabic music', 'arabic pop', 'aragonese folk music', 'argentine music', 'armenian church music', 'armenian folk music', 'armenian music', 'aromanian folk music', 'arrocha', 'arrochadeira', 'arrocha funk', 'arrocha sertanejo', 'ars antiqua', 'ars nova', 'ars subtilior', 'artcore', 'art pop', 'art punk', 'art rock', 'art song', 'ashkenazi cantorial music', 'ashkenazi music', 'asian music', 'asian rock', 'asian underground', 'asmr', 'assamese folk music', 'assiko', 'assyrian folk music', 'asturian folk music', 'athabaskan fiddling', 'atlanta bass', 'atmospheric black metal', 'atmospheric drum and bass', 'atmospheric sludge metal', 'audio documentary', 'aussie pub rock', 'australian folk music', 'austronesian music', 'authenticité', 'autonomic', 'auvergnat folk music', 'avant-folk', 'avant-garde jazz', 'avant-garde metal', 'avant-prog', 'avanzada', 'avar folk music', 'avtorskaya pesnya', 'axé', 'ayyalah', 'azerbaijani mugham', 'azerbaijani music', 'azmari', 'bacardi', 'bachata', 'bachatón', 'bagad', 'baganda music', 'bagatelle', 'baggy', 'baguala', 'baião', 'baila', 'bailecito', 'baisha xiyue', 'baithak gana', 'bakersfield sound', 'balani show', 'balearic beat', 'balinese gamelan', 'balinese music', 'balitaw', 'balkan brass band', 'balkan folk music', 'balkan music', 'balkan pop-folk', 'ballad opera', 'ballet', 'ballet de cour', 'ballroom', 'balochi music', 'baltic folk music', 'baltimore club', 'balto-finnic folk music', 'bamar folk music', 'bamar music', 'bambuco', 'banda de pífano', 'banda music', 'bandari', 'bandas de viento de méxico', 'banda sinaloense', 'bandinha', 'banga', 'bantengan', 'baqashot', 'barber beats', 'barbershop', 'bardcore', 'bard rock', 'baroque music', 'baroque pop', 'baroque suite', 'bashkir folk music', 'bashment soca', 'basque folk music', 'bass house', 'bassline', 'batak music', 'the batcave', 'batida', 'batidão romântico', 'batonebi songs', 'battle record', 'batucada', 'batuque', 'baul gaan', 'bay area hip hop', 'bay area thrash metal', 'bayawan', 'beach music', 'beat', 'beat bolha', 'beatboxing', 'beat bruxaria', 'beatdown hardcore', 'beat fino', 'beat poetry', 'beat rock', 'bebop', 'bedouin music', 'bedroom pop', 'beijing new sound', 'beja music', 'belarusian folk music', 'bele', 'belgian techno', 'belwo', 'bend-skin', 'benga', 'bengali folk music', 'beni', 'benna', 'bentonia school', 'beompae', 'bérite club', 'berlin school', 'bernese dialect scene', 'bhajan', 'bhangra', 'bhojpuri folk music', 'bhojpuri pop', 'big band', 'big beat', 'big music', 'big room house', 'big room trance', 'biguine', 'bikutsi', 'binaural beats', 'biraha', 'bird sounds', 'birmingham sound', 'bit music', 'bitpop', 'black \'n\' roll', 'black ambient', 'blackened crust', 'blackgaze', 'black gospel', 'black metal', 'black midi', 'black noise', 'black rio', 'bleep techno', 'bloghouse', 'blue-eyed soul', 'bluegrass', 'bluegrass gospel', 'blues', 'blues rock', 'bocet', 'boduberu', 'bogino duu', 'bolero', 'bolero-beat', 'bolero español', 'bolero son', 'bolero việt nam', 'bolivian huayño', 'bomba', 'bongo flava', 'boogaloo', 'boogie', 'boogie rock', 'boogie woogie', 'boom bap', 'bop', 'bosnian folk music', 'bossa nova', 'bosstown sound', 'boston hardcore', 'bounce', 'bounce beat', 'bouncy techno', 'bouyon', 'boy band', 'boyfriend country', 'brazilian bass', 'brazilian classical music', 'brazilian folk music', 'brazilian music', 'brazilian phonk', 'breakbeat', 'breakbeat hardcore', 'breakbeat kota', 'breakcore', 'break-in', 'breakstep', 'brega', 'brega calypso', 'bregadeira', 'brega funk', 'breton celtic folk music', 'breton folk music', 'briddim', 'brill building', 'bristol sound', 'britcore', 'britfunk', 'british beat boom', 'british blues', 'british brass band', 'british dance band', 'british folk rock', 'british music', 'british rhythm & blues', 'british trad jazz', 'britpop', 'brno alternative scene', 'broadband noise', 'brock', 'bro-country', 'broken beat', 'broken transmission', 'bronx drill', 'brony music', 'brooklyn drill', 'brostep', 'brukdown', 'brutal death metal', 'brutal prog', 'bubblegum', 'bubblegum bass', 'bubblegum dance', 'bubbling', 'bubbling house', 'buchiage trance', 'buddhist music', 'budots', 'buganda royal court music', 'bugle call', 'bulawayo jazz', 'bulería', 'bulgarian folk music', 'bullerengue', 'burger-highlife', 'burmese classical music', 'burning spirits', 'burrakatha', 'burushaski folk music', 'buryat music', 'byzantine chant', 'byzantine music', 'c86', 'cabaret', 'cabo-zouk', 'cadence lypso', 'cadence rampa', 'cải lương', 'cajun music', 'cakewalk', 'čalgija', 'calipso venezolano', 'calypso', 'cambodian pop', 'campursari', 'campus folk', 'canadian folk music', 'canadian maritime folk', 'canarian folk music', 'canción melódica', 'candombe', 'candombe beat', 'candomblé music', 'cantata', 'cante alentejano', 'canterbury scene', 'canto a lo poeta', 'canto beneventano', 'canto cardenche', 'canto degli alpini', 'canto mozárabe', 'cantonese opera', 'cantopop', 'cantoria', 'cantu a chiterra', 'cantu a tenore', 'canzona', 'canzone d\'autore', 'canzone napoletana', 'canzone neomelodica', 'cape breton fiddling', 'cape breton folk music', 'cape jazz', 'cape verdean music', 'capoeira music', 'caporal', 'capriccio', 'car audio bass', 'caribbean folk music', 'caribbean music', 'carimbó', 'carnatic classical music', 'carnaval cruceño', 'carnavalito', 'carols', 'carranga', 'cartoon music', 'cascadian black metal', 'catalan folk music', 'ca trù', 'caucasian folk music', 'caucasian music', 'cbgb scene', 'ccm', 'celtic chant', 'celtic electronica', 'celtic folk music', 'celtic metal', 'celtic new age', 'celtic punk', 'celtic rock', 'central african music', 'central american music', 'central asian music', 'central asian throat singing', 'česká alternativní scéna', 'česká nová vlna', 'český underground', 'chacarera', 'chachachá', 'chalga', 'chamamé', 'chamamé tropical', 'chamarrita açoriana', 'chamarrita rioplatense', 'chamber folk', 'chamber jazz', 'chamber music', 'chamber pop', 'champeta', 'changa tuki', 'change ringing', 'changjak gugak', 'changüí', 'chanson', 'chanson alternative', 'chanson à texte', 'chanson québécoise', 'chanson réaliste', 'chaozhou xianshi', 'chap hop', 'character piece', 'chazzanut', 'chechen folk music', 'chèo', 'chicago blues', 'chicago drill', 'chicago hard house', 'chicago house', 'chicago no wave', 'chicago polka', 'chicago school', 'chicago soul', 'chicano rap', 'chicha', 'chikipunk', 'children\'s music', 'chilean music', 'chilena', 'chillout', 'chillstep', 'chillsynth', 'chillwave', 'chilote music', 'chimaychi', 'chimurenga', 'chinese classical music', 'chinese folk music', 'chinese literati music', 'chinese music', 'chinese opera', 'chipmunk soul', 'chiptune', 'chöd', 'chopped and screwed', 'chopper', 'choral', 'choral concerto', 'choral symphony', 'choro', 'chotis madrileño', 'christian hardcore', 'christian hip hop', 'christian liturgical music', 'christian rock', 'christmas music', 'chukchi folk music', 'chuntunqui romántico', 'chutney', 'chutney soca', 'chuvash folk music', 'cilokaq', 'cinematic classical', 'ciranda', 'circassian folk music', 'circus march', 'city pop', 'classical crossover', 'classical music', 'classical period', 'classic ragtime', 'cleveland punk', 'close harmony', 'cloud rap', 'clube da esquina', 'cocktail nation', 'coco', 'coke rap', 'coladeira', 'coldwave', 'colinde', 'colour bass', 'comédie-ballet', 'comedy', 'comedy rap', 'comedy rock', 'comfy synth', 'comorian music', 'compas', 'complextro', 'concert band', 'concertina band', 'concerto', 'concerto for orchestra', 'concerto grosso', 'concert spiritual', 'conducted improvisation', 'conga', 'congolese rumba', 'conjunto andino', 'conscious hip hop', 'contemporary country', 'contemporary folk', 'contemporary r&b', 'contenance angloise', 'cool jazz', 'coon song', 'copla', 'coplas cajamarquinas', 'coptic music', 'cornish folk music', 'corrido', 'corrido tumbado', 'corsican folk music', 'cosmic country', 'country', 'country & irish', 'country blues', 'country boogie', 'country folk', 'country gospel', 'countrypolitan', 'country pop', 'country rap', 'country rock', 'country soul', 'country yodeling', 'coupé-décalé', 'cowboy poetry', 'cowpunk', 'c-pop', 'crack rock steady', 'cretan folk music', 'crimean tatar music', 'crime jazz', 'crisálida sónica', 'croatian folk music', 'crossbreed', 'crossover thrash', 'cruise', 'crunk', 'crunkcore', 'crust punk', 'csango folk music', 'csárdás', 'cuarteto', 'cuban charanga', 'cuban music', 'cubaton', 'cuddlecore', 'cueca', 'cueca brava', 'cumbia', 'cumbia amazónica', 'cumbia argentina', 'cumbia chilena', 'cumbia colombiana', 'cumbia mexicana', 'cumbia norteña mexicana', 'cumbia norteña peruana', 'cumbia peruana', 'cumbia pop', 'cumbia rebajada', 'cumbia salvadoreña', 'cumbia santafesina', 'cumbia sonidera', 'cumbiatón', 'cumbia turra', 'cumbia villera', 'cuplé', 'currulao', 'cururu', 'cybergrind', 'cyber metal', 'czech folk music', 'dabke', 'dagestani folk music', 'dagomba music', 'dance', 'dancefloor drum and bass', 'dancehall', 'dance-pop', 'dance-punk', 'dance-punk revival', 'dang-ak', 'dangdut', 'dangdut koplo', 'danish folk music', 'danmono', 'dansbandsmusik', 'dansktop', 'danzón', 'dariacore', 'dark ambient', 'dark cabaret', 'darkcore', 'dark disco', 'dark electro', 'dark folk', 'dark garage', 'dark jazz', 'dark plugg', 'dark psytrance', 'darkside', 'darkstep', 'darksynth', 'darkwave', 'darmstadt school', 'data sonification', 'd-beat', 'd.c. hardcore', 'death \'n\' roll', 'deathchant hardcore', 'deathcore', 'death doom metal', 'deathgrind', 'death industrial', 'death metal', 'deathrock', 'deathstep', 'dechovka', 'deconstructed club', 'deejay', 'deep drum and bass', 'deep funk', 'deep house', 'deep soul', 'deep tech', 'dek bass', 'delta blues', 'dembow', 'demoscene', 'demostyle', 'dennery segment', 'denpa', 'descarga', 'descriptor', 'desgarrada', 'desi hip hop', 'detroit sound', 'detroit techno', 'deutschpunk', 'deutschrock', 'dhaanto', 'dhol tasha', 'dhrupad', 'digicore', 'digital cumbia', 'digital dancehall', 'digital fusion', 'digital hardcore', 'dikir barat', 'dimotika', 'dinka music', 'dirty south', 'disco', 'disco polo', 'disco rap', 'dissonant black metal', 'dissonant death metal', 'diva house', 'divertissement', 'dixieland', 'djanba', 'djent', 'dmv hip hop', 'doble paso', 'dobrado', 'doină', 'dolewave', 'dominican music', 'dondang sayang', 'dongjing', 'donosti sound', 'doomcore', 'doomgaze', 'doom metal', 'doom wad music', 'doo-wop', 'doskpop', 'doujin music', 'downtempo', 'downtempo deathcore', 'dream pop', 'dreampunk', 'dream trance', 'dreamwave', 'drift phonk', 'drill', 'drill and bass', 'drinking song', 'drone', 'drone metal', 'drum and bass', 'drum and bugle corps', 'drumfunk', 'drumless', 'drumline', 'drumstep', 'druze music', 'dsbm', 'dub', 'dub poetry', 'dubstep', 'dubstyle', 'dub techno', 'dubwise drum and bass', 'duma', 'dunedin sound', 'dungeon rap', 'dungeon sound', 'dungeon synth', 'duranguense', 'düsseldorf school', 'dutch cabaret', 'dutch folk music', 'dutch house', 'eai', 'early hardstyle', 'east african music', 'east asian classical music', 'east asian folk music', 'east asian music', 'east coast club', 'east coast hip hop', 'eastern-style polka', 'east slavic church music', 'easycore', 'easy listening', 'ebm', 'eccojams', 'ecm style jazz', 'educational music', 'egg punk', 'egyptian music', 'electric blues', 'electric texas blues', 'electro', 'electroacoustic', 'electroclash', 'electro-disco', 'electro hop', 'electro house', 'electro-industrial', 'electro latino', 'electronic', 'electronic dance music', 'electronicore', 'electropop', 'electro swing', 'electrotango', 'electro trance', 'eleki', 'eletrofunk', 'elizabethan song', 'embolada', 'emo', 'emocore', 'emo-pop', 'emo rap', 'emo revival', 'emoviolence', 'english folk music', 'english pastoral school', 'english underground', 'enka', 'entechna', 'entechna laika', 'epadunk', 'epic collage', 'epic doom metal', 'epic music', 'estonian folk music', 'ethereal wave', 'ethio-jazz', 'ethiopian church music', 'ethiopic music', 'étude', 'euphoric hardstyle', 'eurobeat', 'eurodance', 'euro-disco', 'euro house', 'european folk music', 'european free jazz', 'european music', 'europop', 'euro trance', 'euskal kantagintza berria', 'ewe music', 'exotica', 'experimental', 'experimental big band', 'experimental hip hop', 'experimental rock', 'expressionism', 'extratone', 'fado', 'fado de coimbra', 'fairy tale', 'falak', 'famo', 'fandango', 'fandango caiçara', 'fanfare', 'fantasia', 'fantezi', 'faroese folk music', 'festejo', 'festival progressive house', 'festival trap', 'fidget house', 'field hollers', 'field recordings', 'fife and drum blues', 'fife and drum corps', 'fijian music', 'fijiri', 'filin', 'filk', 'filmi', 'film score', 'film soundtrack', 'finnish folk music', 'finnish tango', 'first wave of detroit techno', 'flamenco', 'flamenco jazz', 'flamenco nuevo', 'flamenco pop', 'flashcore', 'flemish folk music', 'flex dance music', 'flint sound', 'florida breaks', 'florida fast music', 'fm synthesis', 'folk', 'folk baroque', 'folkhop', 'folklor miejski', 'folk metal', 'folk pop', 'folk punk', 'folk rock', 'folktales', 'folktronica', 'fon leb', 'fon music', 'football chant', 'footwork', 'footwork jungle', 'forest psytrance', 'forró', 'forró de favela', 'forró eletrônico', 'forró universitário', 'fort thunder scene', 'foxtrot', 'franco-flemish school', 'frapcore', 'frat rap', 'frat rock', 'freakbeat', 'freak folk', 'free car music', 'free folk', 'freeform hardcore', 'free funk', 'free improvisation', 'free jazz', 'free noise', 'freestyle', 'freetekno', 'french-canadian folk music', 'french caribbean music', 'frenchcore', 'french electro', 'french folk music', 'french hip hop', 'french house', 'french pop', 'frevo', 'frevo-canção', 'frevo de bloco', 'frevo de rua', 'frevo elétrico', 'friese bries', 'fugue', 'fuji', 'fula music', 'full-on psytrance', 'funaná', 'funeral doom metal', 'funeral march', 'fungi', 'funk', 'funk 150 bpm', 'funk automotivo', 'funk brasileiro', 'funk carioca', 'funk consciente', 'funk de bh', 'funk mandelão', 'funk melody', 'funk metal', 'funknejo', 'funk ostentação', 'funkot', 'funk proibidão', 'funk rock', 'funktronica', 'funky breaks', 'funky house', 'furry music', 'fusion gugak', 'future bass', 'future bounce', 'future core', 'future funk', 'future garage', 'future house', 'futurepop', 'future rave', 'future riddim', 'futurism', 'futuristic swag', 'gaana', 'gabber', 'gagaku', 'gagauz folk music', 'gagok', 'gaita zuliana', 'galician folk music', 'gallican chant', 'gambang kromong', 'gamelan', 'gamelan angklung', 'gamelan beleganjur', 'gamelan degung', 'gamelan gender wayang', 'gamelan gong gede', 'gamelan gong kebyar', 'gamelan jegog', 'gamelan sekaten', 'gamelan selonding', 'gamelan semar pegulingan', 'ganga', 'gangsta rap', 'garage house', 'garage psych', 'garage punk', 'garage rock', 'garage rock revival', 'garba', 'garifuna music', 'gascon folk music', 'geek rock', 'género chico', 'genge', 'gengetone', 'georgian folk music', 'german folk music', 'german music', 'g-funk', 'għana', 'ghazal', 'ghetto funk', 'ghetto house', 'ghettotech', 'ghost dance song', 'g-house', 'gilaki music', 'ginan', 'girl group', 'glam metal', 'glam punk', 'glam rock', 'glitch', 'glitch hop', 'glitch hop [edm]', 'glitch pop', 'gnawa', 'goan music', 'goa trance', 'go-go', 'gogo music', 'gommance', 'gondang', 'goombay', 'goral music', 'goregrind', 'gorenoise', 'gospel', 'gospel house', 'gothenburg sound', 'gothic country', 'gothic metal', 'gothic rock', 'gqom', 'grand opéra', 'graphical sound', 'grebo', 'greek folk music', 'greek music', 'greenlandic music', 'greenwich village scene', 'gregorian chant', 'grime', 'grindcore', 'griot music', 'groove metal', 'group sounds', 'grunge', 'gstanzl', 'guaguancó', 'guajira', 'guangdong yinyue', 'guaracha', 'guaracha [edm]', 'guaracha santiagueña', 'guarania', 'gufeng', 'guggenmusik', 'guided meditation', 'guitarrada', 'gujarati folk music', 'gumbe', 'gurage music', 'gwo ka', 'gypsy punk', 'h8000', 'habanera', 'haight-ashbury scene', 'haitian music', 'haitian vodou drumming', 'halftime', 'halloween music', 'hambo', 'hamburger schule', 'hands up', 'han folk music', 'hanmai', 'haozi', 'hapa haole', 'happy hardcore', 'happy rock', 'harana', 'harawi', 'hardbag', 'hardbass', 'hard beat', 'hard bop', 'hardcore breaks', 'hardcore [edm]', 'hardcore hip hop', 'hardcore [punk]', 'hardcore punk', 'hard dance', 'hard drum', 'hardgroove techno', 'hardline', 'hard rock', 'hardstep', 'hardstyle', 'hard techno', 'hardtek', 'hard trance', 'hard trap', 'hardvapour', 'hardwave', 'harlem renaissance', 'harsh noise', 'harsh noise wall', 'hasidic music', 'hát lô tô', 'hauntology', 'hausa music', 'hawaiian music', 'hazara folk music', 'heartland rock', 'heaven trap', 'heavy metal', 'heavy psych', 'heikyoku', 'hellenic black metal', 'henan opera', 'hexd', 'highlife', 'high quality rip', 'hill country blues', 'hill tribe music', 'himene tarava', 'hindustani classical music', 'hi-nrg', 'hipco', 'hip hop', 'hip-hopolo', 'hip hop soul', 'hip house', 'hiplife', 'hispanic american folk music', 'hispanic american music', 'hispanic music', 'hi-tech full-on', 'hi-tech psytrance', 'hmong folk music', 'hmong pop', 'hoboken sound', 'hokkien pop', 'holiday music', 'hollandse school', 'holy minimalism', 'holy terror', 'honkyoku', 'honky tonk', 'honky-tonk piano', 'hornpipe', 'horrorcore', 'horror punk', 'horror synth', 'hot rod music', 'house', 'houston sound', 'huaylarsh', 'huayno', 'humppa', 'hungarian folk music', 'hưng ca', 'hutsul folk music', 'hyang-ak', 'hybrid trap', 'hymn', 'hyperpop', 'hypertechno', 'hyper techno', 'hyphy', 'hypnagogic pop', 'iberian music', 'ibiza trance', 'icelandic folk music', 'idm', 'idol kayō', 'igbo music', 'igorot music', 'illbient', 'ilocano music', 'impressionism', 'impromptu', 'indeterminacy', 'indian pop', 'indie folk', 'indie pop', 'indie rock', 'indie sleaze revival', 'indie surf', 'indietronica', 'indigenous american music', 'indigenous american traditional music', 'indigenous andean music', 'indigenous australian traditional music', 'indigenous north american music', 'indigenous taiwanese music', 'indo-caribbean music', 'indo jazz', 'indonesian music', 'indorock', 'industrial', 'industrial & noise', 'industrial folk song', 'industrial hardcore', 'industrial hip hop', 'industrial metal', 'industrial rock', 'industrial techno', 'inkiranya', 'insect sounds', 'instrumental hip hop', 'integral serialism', 'interview', 'inuit music', 'inuit vocal games', 'ionian islands folk music', 'iraqi maqam', 'irish folk music', 'irish showband', 'isicathamiya', 'islamic religious music & recitation', 'israeli folk music', 'istrian folk music', 'italian folk music', 'italian music', 'italo dance', 'italo-disco', 'italo house', 'italo pop', 'izlan', 'izvorna bosanska muzika', 'jackin\' house', 'jaipongan', 'jamaican music', 'jamaican ska', 'jam band', 'james bay fiddling', 'jamgrass', 'jangle pop', 'japanese classical music', 'japanese folk music', 'japanese hardcore', 'japanese hip hop', 'japanese idol', 'japanese music', 'javanese gamelan', 'javanese music', 'jawaiian', 'jazz', 'jazz-funk', 'jazz fusion', 'jazz guachaca', 'jazz manouche', 'jazz mugham', 'jazz poetry', 'jazz pop', 'jazz rap', 'jazz-rock', 'jazzstep', 'j-core', 'al jeel', 'jeong-ak', 'jerk', 'jerk rap', 'jersey club', 'jersey club rap', 'jersey drill', 'jersey shore sound', 'jersey sound', 'jesus music', 'j-euro', 'jewish liturgical music', 'jewish music', 'jiangnan sizhu', 'jibaro', 'jigg', 'jilala music', 'jingles', 'jit', 'jiuta', 'joik', 'jongo', 'jook', 'joropo', 'jōruri', 'jovem guarda', 'j-pop', 'jubilee', 'jug band', 'jùjú', 'juke', 'jump blues', 'jumpstyle', 'jump-up', 'jungle', 'jungle dutch', 'jungle terror', 'junkanoo', 'kabarett', 'kabye folk music', 'kabyle music', 'kacapi suling', 'kadongo kamu', 'kafi', 'kagura', 'kai', 'kaiso', 'kakawin', 'kalattut', 'kalindula', 'kalmyk music', 'kalon\'ny fahiny', 'kaneka', 'kan ha diskan', 'kannada folk music', 'kansai no wave', 'kantan chamorrita', 'kanto', 'kantruem', 'kapuka', 'karachay-balkarian music', 'karakalpak traditional music', 'karelian folk music', 'kaseko', 'kashubian folk music', 'kawaii future bass', 'kawaii metal', 'kayōkyoku', 'kazakh music', 'kecak', 'kef music', 'keroncong', 'kete', 'ketuk tilu', 'khakas traditional music', 'khaliji music', 'khayal', 'khmer folk music', 'khmer music', 'khoisan folk music', 'khrueang sai', 'kidandali', 'kidumbak', 'kilapanga', 'kirtan', 'kitchen dance music', 'kizomba', 'klapa', 'klasik', 'kleinkunst', 'klezmer', 'kliningan', 'koche bazari', 'komi folk music', 'konnakol', 'könsrock', 'korean ballad', 'korean classical music', 'korean folk music', 'korean music', 'korean revolutionary opera', 'kote kei', 'kouta', 'k-pop', 'krakowiak', 'krautrock', 'kréyol djaz', 'krishnacore', 'kriyat hatorah', 'kru music', 'krushclub', 'kuda kepang', 'kuduro', 'kujawiak', 'kujon', 'kulintang', 'kumina', 'kumiuta', 'kundiman', 'kunqu opera', 'kurdish music', 'kurpian folk music', 'kwaito', 'kwassa kwassa', 'kwela', 'kyivan chant', 'kyrgyz traditional music', 'la beat scene', 'lab polyphony', 'ladbroke grove scene', 'ladino folksong', 'la hard house', 'laika', 'lambada', 'ländler', 'landó', 'langgam jawa', 'lao folk music', 'latin alternative', 'latin american classical music', 'latin disco', 'latin electronic', 'latin freestyle', 'latin funk', 'latin house', 'latin jazz', 'latin pop', 'latin rap', 'latin rock', 'latin soul', 'latvian folk music', 'lauda', 'laurel canyon scene', 'lavani', 'lectures', 'leningrad rock club scene', 'lento violento', 'levantine arabic music', 'levenslied', 'library music', 'lied', 'liedermacher', 'light music', 'lilat', 'liquid drum and bass', 'liquid riddim', 'liscio', 'lisu music', 'lithuanian folk music', 'little band scene', 'livetronica', 'livonian folk music', 'liwa', 'lo-fi hip hop', 'lo-fi house', 'loft jazz', 'lokal musik', 'lolicore', 'loner folk', 'los angeles counterculture', 'louisiana music', 'louisville sound', 'lounge', 'lovers rock', 'lowend', 'lowercase', 'luk krung', 'luk thung', 'lullabies', 'lundu', 'luri folk music', 'luxembourgish folk music', 'macedonian folk music', 'machine rock', 'madchester', 'maddahi', 'madrigal', 'mafioso rap', 'maftirim', 'maghrebi music', 'magyar nóta', 'mahori', 'mahraganat', 'maidcore', 'makina', 'makossa', 'malagasy folk music', 'malagasy music', 'malagueña venezolana', 'malayali folk music', 'malay classical music', 'malay folk music', 'malay gamelan', 'malay music', 'malhun', 'mall screamo', 'mallsoft', 'maloya', 'maloya électronique', 'maloya élektrik', 'mambo', 'mambo chileno', 'mambo urbano', 'manchu music', 'mande music', 'mandopop', 'manele', 'mangambeu', 'manguebeat', 'manila sound', 'mantra', 'manx folk music', 'manyao', 'manzuma', 'māori music', 'mappila', 'mapuche folk music', 'maqāmic music', 'marabi', 'maracatu', 'marathi folk music', 'march', 'marching band', 'marchinha', 'mariachi', 'mari folk music', 'marinera', 'marrabenta', 'martial industrial', 'mashcore', 'mashup', 'maskandi', 'mass', 'mataali', 'mathcore', 'math pop', 'math rock', 'maxixe', 'maya music', 'mazur', 'mazurka', 'mbalax', 'mbaqanga', 'mbenga-mbuti music', 'mbolé', 'mbube', 'mchiriku', 'mechanical music', 'medieval classical music', 'medieval lyric poetry', 'mega funk', 'meiji shinkyoku', 'melanesian music', 'melbourne bounce', 'melodic bass', 'melodic black metal', 'melodic death metal', 'melodic dubstep', 'melodic hardcore', 'melodic house', 'melodic metalcore', 'melodic techno', 'mélodie', 'memphis rap', 'mentai rock', 'mento', 'merecumbé', 'merengue', 'merengue típico', 'merenhouse', 'méringue', 'merseybeat', 'mesoamerican music', 'mesopotamian music', 'metal', 'metalcore', 'métis fiddling', 'métis music', 'mexican folk music', 'mexican music', 'meyxana', 'miami bass', 'microfunk', 'microhouse', 'micromontage', 'micronesian music', 'microtonal classical', 'midi music', 'mid-school hip hop', 'midtempo bass', 'midwest emo', 'midwest hip hop', 'miejski folk', 'military cadence', 'milonga', 'min\'yō', 'minangkabau music', 'minatory', 'mincecore', 'minimal drum and bass', 'minimalism', 'minimal synth', 'minimal techno', 'minimal wave', 'minneapolis sound', 'minstrelsy', 'minyue', 'mittelalter-metal', 'mittelalter-rock', 'młoda polska', 'mobb music', 'mod', 'moda de viola', 'modal jazz', 'modern classical', 'modern creative', 'modern laika', 'modinha', 'mod revival', 'molam', 'molam sing', 'mongolian music', 'mongolian throat singing', 'mono', 'monodrama', 'montenegrin folk music', 'mood kayō', 'moogsploitation', 'moombahcore', 'moombahton', 'moorish music', 'moravian folk music', 'mordvin folk music', 'morenada', 'morna', 'moroccan chaabi', 'morris music', 'moscow school', 'mossi music', 'motet', 'motown sound', 'motswako', 'moutya', 'movida madrileña', 'movimiento alterado', 'mozambique', 'mpb', 'muak', 'mugithi', 'mulatós', 'muliza', 'murga', 'murga uruguaya', 'musette', 'música cebolla', 'música criolla peruana', 'música de intervenção', 'música festera', 'música gaúcha', 'musical comedy', 'música llanera', 'musical parody', 'musical theatre and entertainment', 'música típica chilena', 'music hall', 'musika popullore', 'mūsīqā lubnāniyya', 'musique concrète', 'musique concrète instrumentale', 'mutant disco', 'muzică de mahala', 'muzică lăutărească', 'muzika mizrahit', 'muzikat dika\'on', 'muzika yehudit mekorit', 'muziki wa dansi', 'nagauta', 'nagoya kei', 'nahua music', 'nanyin', 'nardcore', 'narodno zabavna glasba', 'nasheed', 'nashville sound', 'native american new age', 'nature recordings', 'naturjodel', 'navajo music', 'naxi music', 'nederbeat', 'nederpop', 'neo-acoustic', 'neo-bop', 'neo-canterbury', 'neo-city pop', 'neoclassical darkwave', 'neoclassical metal', 'neoclassical new age', 'neoclassicism', 'neocrust', 'neofolk', 'neofolklore', 'neo-grime', 'neo kyma', 'neo-medieval folk', 'neon pop punk', 'neo-pagan folk', 'neoperreo', 'neo-prog', 'neo-psychedelia', 'neo rave', 'neoromanticism', 'neo-soul', 'neo-traditionalist country', 'nerdcore hip hop', 'nerdcore techno', 'nervous music', 'neue deutsche härte', 'neue deutsche todeskunst', 'neue deutsche welle', 'neue volksmusik', 'neurofunk', 'neurohop', 'new age', 'new age kirtan', 'newa music', 'new beat', 'new brunswick basement scene', 'new complexity', 'new direction', 'newfoundland folk music', 'new german school', 'new jack swing', 'new jazz', 'new london jazz', 'new mexico music', 'new music', 'new orleans blues', 'new orleans brass band', 'new orleans r&b', 'new partisans', 'new pop', 'new primitivism', 'new rave', 'new romantic', 'new tone', 'new wave', 'new wave of new wave', 'new way of danish fuck you', 'new weird america', 'new weird finland', 'new york drill', 'new york hardcore', 'new york school', 'ngâm thơ', 'ngoma', 'nguni folk music', 'nhạc đỏ', 'nhạc tiền chiến', 'nhạc vàng', 'nightcore', 'nigun', 'nintendocore', 'nitzhonot', 'nivkh music', 'nocturne', 'noh', 'noiadance', 'noise', 'noisecore', 'noisegrind', 'noise pop', 'noise rock', 'nola sludge', 'no melody', 'nordic folk music', 'nordic folk rock', 'nordic music', 'nordic old time dance music', 'nortec', 'norteño', 'north african music', 'north asian music', 'northeastern african music', 'northeastern brazilian music', 'northern american music', 'northern brazilian music', 'northern gothic', 'northern soul', 'northumbrian folk music', 'norwegian folk music', 'nouveau zydeco', 'nouvelle chanson française', 'nova cançó', 'nòva cançon', 'nova srpska scena', 'nova vanguarda paulistana', 'novaya scena', 'novelty', 'novelty piano', 'novo dub', 'no wave', 'nrg', 'nuban', 'nubian music', 'nu-disco', 'nuer music', 'nueva canción', 'nueva canción chilena', 'nueva canción española', 'nueva canción latinoamericana', 'nueva cumbia chilena', 'nueva escena chilena', 'nueva ola', 'nueva trova', 'nuevo cancionero', 'nu jazz', 'nu metal', 'nursery rhymes', 'nu skool breaks', 'nustyle', 'nu style gabber', 'nwobhm', 'nyahbinghi', 'o\'odham music', 'oberek', 'ob-ugric folk music', 'occitan folk music', 'occult rock', 'oceanian music', 'odia folk music', 'odissi classical music', 'ogene music', 'oi!', 'okinawan music', 'old roman chant', 'old-time', 'omutibo', 'onda nueva', 'ondō', 'onkyo', 'opera', 'opéra-ballet', 'opera buffa', 'opéra-comique', 'opera semiseria', 'opera seria', 'operetta', 'opm', 'òrain ghàidhlig', 'òrain luaidh', 'oratorio', 'orchestral music', 'orchestral song', 'organic house', 'ori deck', 'oriental ballad', 'oriental jewish music', 'orkes gambus', 'oromo music', 'orthodox pop', 'ossetian folk music', 'otomad', 'ottoman military music', 'outlaw country', 'outsider house', 'overture', 'özgün müzik', 'pachanga', 'pacific reggae', 'pagan black metal', 'paghjella', 'pagodão', 'pagode', 'pagode romântico', 'paisley underground', 'pakacaping music', 'palingsound', 'palm desert scene', 'palm wine music', 'palo de mayo', 'pamiri music', 'pansori', 'pansy craze', 'papuan folk music', 'parang', 'parlour music', 'partido alto', 'pashto folk music', 'pasillo', 'pasodoble', 'passion', 'pásztordal', 'payada', 'peak time techno', 'pécs underground scene', 'peking opera', 'pennsylvania dutch folk music', 'pep band', 'persian classical music', 'persian folk music', 'persian music', 'persian pop', 'peruvian music', 'pessoal do ceará', 'p-funk', 'philippine music', 'philippine rondalla', 'philly club', 'philly club rap', 'philly drill', 'philly soul', 'phleng phuea chiwit', 'phonk', 'phonk house', 'piano blues', 'piano rock', 'picopop', 'piedmont blues', 'pigfuck', 'pilón', 'pimba', 'pinoy folk rock', 'pinpeat', 'pìobaireachd', 'piosenka aktorska', 'pipe band', 'piphat', 'pirekua', 'piseiro', 'piyyut', 'pizzica', 'plainsong', 'plena', 'plugg', 'pluggnb', 'plunderphonics', 'poetry', 'poezja śpiewana', 'polifonia occitana', 'polish folk music', 'polish goral music', 'polish music', 'political hip hop', 'polka', 'polka paraguaya', 'polka peruana', 'polonaise', 'polska', 'polynesian music', 'polyphonic chant', 'pon-chak disco', 'ponto de umbanda', 'pop', 'pop batak', 'pop ghazal', 'pop kreatif', 'pop minang', 'pop punk', 'pop raï', 'pop rap', 'pop reggae', 'pop rock', 'pops orchestra', 'pop soul', 'pop sunda', 'pop yeh-yeh', 'porn groove', 'pornogrind', 'porro', 'portuguese folk music', 'portuguese music', 'positive punk', 'post-bop', 'post-britpop', 'post-dubstep', 'post-grunge', 'post-hardcore', 'post-industrial', 'post-metal', 'post-minimalism', 'post-punk', 'post-punk revival', 'post-rock', 'power electronics', 'power metal', 'power noise', 'power pop', 'power soca', 'powerstomp', 'powerviolence', 'powwow music', 'p-pop', 'praise & worship', 'praise break', 'prank call', 'prehistoric music', 'prelude', 'process music', 'progg', 'progressive big band', 'progressive bluegrass', 'progressive breaks', 'progressive country', 'progressive electronic', 'progressive folk', 'progressive house', 'progressive metal', 'progressive pop', 'progressive psytrance', 'progressive rock', 'progressive soul', 'progressive trance', 'proto-punk', 'psichedelia occulta italiana', 'psybient', 'psybreaks', 'psychedelia', 'psychedelic folk', 'psychedelic pop', 'psychedelic rock', 'psychedelic soul', 'psychobilly', 'psychsploitation', 'psycore', 'psystyle', 'psytrance', 'pub rock', 'pueblo music', 'pungmul', 'punjabi folk music', 'punk', 'punk blues', 'punk poetry', 'punk rock', 'punta', 'purísima', 'purple sound', 'puxa', 'qaraami', 'qasidah modern', 'qawwali', 'q-pop', 'quan họ', 'queercore', 'quyi', 'rabbit song', 'rabiz', 'rabm', 'rabòday', 'radio broadcast recordings', 'radio drama', 'raga rock', 'rage', 'ragga', 'raggacore', 'ragga jungle', 'raggatek', 'ragtime', 'ragtime song', 'raï', 'rain sounds', 'rajasthani folk music', 'r&b', 'ranchera', 'rapai dabõih', 'rap metal', 'rap rock', 'rapso', 'raqs baladi', 'rara', 'rare phonk', 'rasin', 'rasqueado', 'rasteirinha', 'ratchet', 'rautalanka', 'rawphoric', 'rawstyle', 'red dirt', 'red disco', 'reductionism', 'regalia', 'reggae', 'reggae rock', 'reggae / ska / dancehall', 'reggaetón', 'regional music', 'rembetika', 'renaissance music', 'reparto', 'repente', 'requiem', 'revolutionary opera', 'revolution summer', 'revue', 'rhumba', 'rhythm & blues', 'ricercar', 'riddim', 'rigsar', 'ring shout', 'rioplatense music', 'riot grrrl', 'ripsaw', 'ritmada', 'ritual ambient', 'rizitika', 'rkt', 'road rap', 'rock', 'rockabilly', 'rock & roll', 'rock andaluz', 'rock andino', 'rock barrial', 'rock in opposition', 'rock kapak', 'rock musical', 'rock opera', 'rock radical vasco', 'rock rural', 'rock sónico', 'rocksteady', 'rock subterráneo', 'rock triste', 'rock urbano español', 'rock urbano mexicano', 'rōkyoku', 'romance', 'romanian etno music', 'romanian folk music', 'romanian music', 'romanian popcorn', 'romani folk music', 'roman school', 'romanţe', 'romanticism', 'romantic style', 'romantische oper', 'rominimal', 'rom kbach', 'roots reggae', 'roots rock', 'rumba catalana', 'rumba cubana', 'rumba flamenca', 'rune singing', 'russemusikk', 'russian chanson', 'russian folk music', 'russian music', 'russian romance', 'ryūkōka', 'ryukyuan music', 'sa\'idi', 'sacred harp singing', 'sacred singing circle', 'sacred steel', 'saeta', 'sahrawi music', 'saint petersburg school', 'sakha traditional music', 'salegy', 'salsa', 'salsa choke', 'salsa dura', 'salsa romántica', 'saluang klasik', 'samba', 'samba-canção', 'samba-choro', 'samba de breque', 'samba de gafieira', 'samba de roda', 'samba de terreiro', 'samba-enredo', 'samba-exaltação', 'samba-jazz', 'samba-joia', 'sambalanço', 'samba rap', 'samba-reggae', 'samba-rock', 'samba soul', 'sambass', 'samoan music', 'samoyedic folk music', 'sample drill', 'samri', 'san diego sound', 'san francisco sound', 'sanjo', 'santé engagé', 'santería music', 'sarala gee', 'sardana', 'sardinian folk music', 'sarum chant', 'sass', 'satire', 'sawt', 'saya', 'scam rap', 'scene', 'scenes & movements', 'schlager', 'schottische', 'schranz', 'scots song', 'scottish country dance music', 'scottish folk music', 'scottish folk revival', 'scouse house', 'screamo', 'scrumpy and western', 'sean-nós', 'seapunk', 'sea shanty', 'second british folk revival', 'second viennese school', 'second wave of detroit techno', 'séga', 'séga tambour', 'seggae', 'seinn nan salm', 'seishun punk', 'semba', 'semi-trot', 'sephardic music', 'sequencer & tracker', 'serbian folk music', 'serenade', 'serialism', 'sermons', 'sertanejo', 'sertanejo de raiz', 'sertanejo romântico', 'sertanejo universitário', 'seto leelo', 'sevdalinka', 'sevillanas', 'sexy drill', 'seychelles & mascarene islands music', 'shaabi', 'shabad kirtan', 'shaker music', 'shan\'ge', 'shangaan electro', 'shaoxing opera', 'shashmaqam', 'shatta', 'shehhi music', 'shetland & orkney folk music', 'shibuya-kei', 'shidaiqu', 'shilla', 'shilluk music', 'shimokita-kei', 'shitgaze', 'shoegaze', 'shōmyō', 'shona mbira music', 'shona music', 'shoor', 'show tunes', 'siberian punk', 'sichuan opera', 'sierreño', 'siffleur', 'sigilkore', 'sinawi', 'sindhi music', 'sinfonia concertante', 'singeli', 'singer-songwriter', 'singspiel', 'sinhalese folk music', 'sissy bounce', 'sitarsploitation', 'sizhu music', 'ska', 'skacore', 'ska punk', 'skate punk', 'sketch comedy', 'skiffle', 'skiladika', 'skinhead reggae', 'skullstep', 'skweee', 'slacker rock', 'slack-key guitar', 'slam death metal', 'slam poetry', 'slap house', 'slavic folk music', 'sleaze rock', 'slimepunk', 'slovak folk music', 'slovenian folk music', 'slowcore', 'slowed & reverb', 'sludge metal', 'slushwave', 'smooth jazz', 'smooth soul', 'snap', 'soca', 'soft rock', 'soft visual', 'soga music', 'sōkyoku', 'solonese gamelan', 'somali music', 'sonata', 'son calentano', 'son cubano', 'son de pascua', 'songhai music', 'songo', 'son huasteco', 'son istmeño', 'son jarocho', 'son montuno', 'son nica', 'sonorism', 'sophisti-pop', 'sotho-tswana folk music', 'soukous', 'soul', 'soul blues', 'soul jazz', 'sound art', 'soundclown', 'sound collage', 'sound effects', 'sound poetry', 'soundtrack', 'south american music', 'south asian classical music', 'south asian folk music', 'south asian music', 'southeast asian classical music', 'southeast asian folk music', 'southeast asian music', 'southeastern brazilian music', 'southern african folk music', 'southern african music', 'southern brazilian music', 'southern gospel', 'southern hip hop', 'southern metal', 'southern rock', 'southern soul', 'south florida soundcloud rap', 'soviet estrada', 'sovietwave', 'space age pop', 'space ambient', 'space disco', 'space rock', 'space rock revival', 'spacesynth', 'spaghetti western', 'spanish classical music', 'spanish folk music', 'spanish music', 'spectralism', 'speeches', 'speedcore', 'speed garage', 'speed house', 'speed metal', 'spiritual', 'spiritual art song', 'spiritual jazz', 'splittercore', 'spoken word', 'spouge', 'spy music', 'staïfi', 'standards', 'stand-up comedy', 'starogradska muzika', 'steel band', 'stenchcore', 'stereo', 'stochastic music', 'stomp and holler', 'stoner metal', 'stoner rap', 'stoner rock', 'stornello', 'straight edge', 'street punk', 'stride', 'string quartet', 'stutter house', 'sufiana kalam', 'sufi music', 'sufi rock', 'sundanese music', 'sungura', 'sunset strip glam metal', 'sunshine pop', 'suomisaundi', 'surf music', 'surf punk', 'surf rock', 'sutartinės', 'swamp blues', 'swamp pop', 'swamp rock', 'swancore', 'swedish folk music', 'sweet jazz', 'swing', 'swing musette', 'swing revival', 'symphonic black metal', 'symphonic metal', 'symphonic mugham', 'symphonic prog', 'symphonic rock', 'symphony', 'synth funk', 'synthpop', 'synth punk', 'synthwave', 'syriac chant', 'taarab', 'tahitian music', 'taiko', 'tajik music', 'takamba', 'talempong', 'talempong goyang', 'talking blues', 'tallava', 'tamborera', 'tamborito', 'tamborzão', 'tamil folk music', 'tammurriata', 'tân cổ giao duyên', 'tango', 'tango nuevo', 'tanjidor', 'taoist ritual music', 'tape music', 'taquirari', 'taqwacore', 'tarana', 'tarantella', 'tarawangsa', 'tarraxinha', 'tarz', 'tassa', 'tassu', 'tbm', 'tchinkoumé', 'tchink system', 'tearout', 'tearout [brostep]', 'tech house', 'technical death metal', 'technical thrash metal', 'techno', 'techno bass', 'technoid', 'techno kayō', 'techstep', 'tech trance', 'tecnobanda', 'tecnobrega', 'tecnofunk', 'tecnomerengue', 'tecnorumba', 'teen pop', 'tejano music', 'television music', 'telugu folk music', 'tembang sunda cianjuran', 'terrorcore', 'terror plugg', 'teutonic thrash metal', 'texan music', 'texas psychedelia', 'tex-mex', 'thai classical music', 'thai folk music', 'thai music', 'thall', 'theme and variation', 'third stream', 'third wave ska', 'thrashcore', 'thrash metal', 'thumri', 'tibetan buddhist chant', 'tibetan music', 'tibetan new age', 'tigrinya music', 'timba', 'timbila', 'tin pan alley', 'tishoumaren', 'tivaner inngernerlu', 'tizita', 'toada de boi', 'toccata', 'tolai rock', 'tonada chilena', 'tonada potosina', 'tondero', 'tone poem', 'tontipop', 'topanga canyon scene', 'tosk polyphony', 'totalism', 'touhou music', 'township bubblegum', 'township jive', 'toypop', 'toytown pop', 't-pop', 'tracker music', 'tradi-moderne congolais', 'tradi-moderne ivoirien', 'traditional black gospel', 'traditional bluegrass', 'traditional cajun music', 'traditional country', 'traditional doom metal', 'traditional folk music', 'traditional maloya', 'traditional pop', 'traditional raï', 'traditional séga', 'tragédie en musique', 'trallalero', 'trampská hudba', 'trance', 'trance 2.0', 'trance metal', 'trancestep', 'trap', 'trap dancehall', 'trap [edm]', 'trapfunk', 'trap latino', 'trap metal', 'trap shaabi', 'trap soul', 'trás-os-montes folk music', 'tread', 'tribal ambient', 'tribal guarachero', 'tribal house', 'trikitixa', 'trip hop', 'tropical house', 'tropicália', 'tropical rock', 'tropicanibalismo', 'tropipop', 'trot', 'trova', 'trova rosarina', 'trova yucateca', 'truck driving country', 'tsapiky', 'tsonga disco', 'tsugaru shamisen', 'tuareg music', 'tumba', 'tumba francesa', 'tumbélé', 'tunantada', 'turbo-folk', 'turkic-mongolic music', 'turkish black sea region folk music', 'turkish classical music', 'turkish folk music', 'turkish mevlevi music', 'turkish music', 'turkish pop', 'turkmen music', 'turntable music', 'turntablism', 'tuvan throat singing', 'twa music', 'twee pop', 'twelve muqam', 'twerk', 'twist', 'twoubadou', 'uaajeerneq', 'udigrudi', 'udmurt folk music', 'uk82', 'uk bass', 'uk drill', 'uk funky', 'uk garage', 'uk hardcore', 'uk hard house', 'uk hip hop', 'uk jackin\'', 'ukrainian folk music', 'uk street soul', 'ultra', 'umeå hardcore', 'unakesa', 'unyago', 'uplifting trance', 'upopo', 'uptempo hardcore', 'urban contemporary gospel', 'urban cowboy', 'urban grooves', 'urtiin duu', 'urumi melam', 'us power metal', 'utaite', 'utopian virtual', 'uyghur music', 'uzbek music', 'uzun hava', 'vaigat', 'valencian folk music', 'vallenato', 'valsa brasileira', 'vals criollo', 'vals venezolano', 'vanera', 'vanguarda paulista', 'vapor', 'vapornoise', 'vaportrap', 'vaporwave', 'vaudeville', 'vaudeville blues', 'vedic chant', 'vegan straight edge', 'verismo', 'video game music', 'vietnamese court music', 'vietnamese folk music', 'vietnamese music', 'vietnamese new wave', 'vietnamese opera', 'vikingarock', 'viking metal', 'villancico', 'vinahouse', 'vira', 'virgin islander cariso', 'visa', 'visual kei', 'vixa', 'vocalese', 'vocal group', 'vocal jazz', 'vocaloid scene', 'vocal surf', 'vocal trance', 'voëlvry movement', 'volga tatar folk music', 'volga-ural folk music', 'volkstümliche musik', 'v-pop', 'vude', 'wa euro', 'waila', 'waka', 'walloon folk music', 'waltz', 'wangga', 'warez scene', 'war metal', 'warsaw city folk', 'wassoulou', 'the wave', 'wave', 'weightless', 'welayta music', 'welsh folk music', 'west african music', 'west asian folk music', 'west asian music', 'west coast breaks', 'west coast hip hop', 'west coast jazz', 'west coast sound of holland', 'western', 'western classical music', 'western swing', 'west side sound', 'whale song', 'white voice', 'windmill scene', 'winter synth', 'witch house', 'wizard rock', 'wolof music', 'women\'s music movement', 'wong shadow', 'wonky', 'wonky techno', 'work song', 'worldbeat', 'wyrd folk', 'xẩm', 'xaxado', 'xian psych', 'xibei feng', 'xinyao', 'xote', 'xtra raw', 'xuc', 'yacht rock', 'yakousei', 'yangzhou opera', 'yaraví', 'yass', 'yayue', 'yemenite jewish diwan', 'yé-yé', 'yiddish folksong', 'yodeling', 'yoruba folk opera', 'yoruba music', 'youth crew', 'ytpmv', 'yugoslav new wave', 'yukar', 'yu-mex', 'zajal', 'zamacueca', 'zamba', 'zamrock', 'zarzuela', 'zarzuela barroca', 'zarzuela grande', 'zeitoper', 'zemirot', 'zenonesque', 'zess', 'zeuhl', 'zeybek', 'zhabdro gorgom', 'zhongguo feng', 'ziglibithy', 'zimdancehall', 'zinli', 'znamenny chant', 'zoblazo', 'zohioliin duu', 'zolo', 'zouglou', 'zouk', 'zouk love', 'zydeco');
 var fFriendAttach = 0;
 var descriptorcurrentSuggestionList = new Array();
 var descriptorcurrentSuggestion = null;
 var descriptorinputEl;
 var showList = false;

 var timer = null;

 function descriptorattachSuggest(id)
 {

    descriptorinputEl = did(id); 
   
    descriptorinputEl.setAttribute('autocomplete', 'off');
   
    descriptorinputEl.onkeydown = function(e) {
        var evx; 
        try { evx = event; } catch (ex) { evx = e; }
        descriptorhandleKeyPress( 0, evx);
        if ( evx.keyCode == 13 ) { return false; } 

    };
   
    descriptorinputEl.onkeyup = function(e) {
        var evx; 
        try { evx = event; } catch (ex) { evx = e; }
        descriptorhandleKeyPress( 1, evx);
        if ( evx.keyCode == 13 ) { return false; } 
    };
   
    descriptorinputEl.onblur = function() {
      if ( timer ) {
         clearTimeout(timer);
         timer = null;
      }
      timer = setTimeout(descriptorhideSuggestions, 200);
      if ( fFriendAttach ) {
         friendAttachFunction(); 
      }
    };
    var ssel = did('searchsuggestions');
    var pos = $(descriptorinputEl).offset();
    ssel.style.top = (pos.top+30) + 'px';
    ssel.style.left = pos.left + 'px';
    if ( showList ) {
      descriptorcalculateSuggestions();
    }
 }

 function descriptorhandleKeyPress ( up, event ) 
 {

   var keycode = event.keyCode;
   if ( descriptorinSuggest )
   {
      if ( gkUp == keycode && !up  )
      {
         descriptorselectPreviousSuggestion();
         return false;
      }
      else if ( gkDown == keycode && !up  )
      {
         descriptorselectNextSuggestion();
         return false;
      }
      else if ( gkEnter == keycode && !up  )
      {
         descriptorchooseSuggestion(descriptorcurrentSuggestion);
         return false;
      }
      else if ( gkEsc == keycode && !up )
      {
         descriptorhideSuggestions();
         return false;
      }
      else if ( !up )
      {
           if ( timer ) {
              clearTimeout(timer);
              timer = null;
           }
           timer = setTimeout(descriptorcalculateSuggestions, 150);
        // setTimeout(descriptorcalculateSuggestions, 50);
//         descriptorcalculateSuggestions();
         return false;
      }
      else
      {
     //    setTimeout(descriptorcalculateSuggestions, 50);
      }

   }
   else 
   {
      if ( up )
      {
           if ( timer ) {
              clearTimeout(timer);
              timer = null;
           }
           timer = setTimeout(descriptorcalculateSuggestions, 150);
      }
      //descriptorcalculateSuggestions();
   }
   
 } 
 function descriptorselectPreviousSuggestion ()
 {
   if ( descriptorcurrentSuggestionList.length == 0 ) 
   {
      return;
   }
   if ( descriptorcurrentSuggestion == null ) 
   {
      descriptorcurrentSuggestion = descriptorcurrentSuggestionList[descriptorcurrentSuggestionList.length-1];
      descriptorcurrentSuggestion.className = 'suggestionsel';
      return;
   }
   var last = null;
   var iLen = descriptorcurrentSuggestionList.length;
   for ( var i = 0 ; i < iLen ; i++  ) 
   {  
      if ( descriptorcurrentSuggestionList[i].className == 'suggestionsel' )
      { 
         if ( last == null ) 
         {
            descriptorcurrentSuggestion.className = 'suggestion';
            descriptorcurrentSuggestion = descriptorcurrentSuggestionList[descriptorcurrentSuggestionList.length-1];
            descriptorcurrentSuggestion.className = 'suggestionsel';
            return;
         }
         else
         {
            descriptorcurrentSuggestion.className = 'suggestion';
            descriptorcurrentSuggestion = last;
            descriptorcurrentSuggestion.className = 'suggestionsel';
            return;
         }
      }
      last = descriptorcurrentSuggestionList[i];
   }
 }

 function descriptorselectNextSuggestion  ()
 {
   if ( descriptorcurrentSuggestionList.length == 0 ) 
   {
      return;
   }
   if ( descriptorcurrentSuggestion == null ) 
   {
      descriptorcurrentSuggestion = descriptorcurrentSuggestionList[0];
      descriptorcurrentSuggestion.className = 'suggestionsel';
      return;
   }
   var last = null;
   for ( var i = descriptorcurrentSuggestionList.length-1; i >= 0; i-- ) 
   {  
      if ( descriptorcurrentSuggestionList[i].className == 'suggestionsel' )
      { 
         if ( last == null ) 
         {
            descriptorcurrentSuggestion.className = 'suggestion';
            descriptorcurrentSuggestion = descriptorcurrentSuggestionList[0];
            descriptorcurrentSuggestion.className = 'suggestionsel';
            return;
         }
         else
         {
            descriptorcurrentSuggestion.className = 'suggestion';
            descriptorcurrentSuggestion = last;
            descriptorcurrentSuggestion.className = 'suggestionsel';
            return;
         }
      }
      last = descriptorcurrentSuggestionList[i];
   }

 }

 function descriptorchooseSuggestion (obj)
 {
   if ( obj )
   {
      var innerTxt; 

      if ( obj.innerText )
      {
        innerTxt = obj.innerText;
      }
      else
      {
        innerTxt = obj.textContent;
      }

      var terms = descriptorinputEl.value.trim().split(',');
      terms[terms.length-1] = innerTxt;
      var iLen = terms.length;
      for ( var i = 0; i < iLen; i++ )
      {
         terms[i] = terms[i].trim();
      }

      descriptorinputEl.value = terms.join(', ') ;
   }
   descriptorhideSuggestions();

 }


 function _isMatch (name, val) {
      // -1 == name.toLowerCase().search(val.toLowerCase()) && val.length
      val = removeDiacritics(val.toLowerCase()).replace(/^\s+|\s+$/g, '');
      name = removeDiacritics(name.toLowerCase());

      if ( name.indexOf(val) == 0 ) {
         return 1
      }
      var names = name.replace(/^\s+|\s+$/g, '').split(' ');
      var vals = val.replace(/^\s+|\s+$/g, '').split(' ');

      var inARow = 0;

      var numMatches = 0;

      var valsMatched = new Array();

      var jLen = names.length;
      for ( var j = 0; j < jLen; j++ ) {
        var valPart = names[j].trim();
        var iLen = vals.length;
        for ( var i = 0; i < iLen; i++ ) {
          var namePart = vals[i].trim();
          if ( namePart.indexOf(valPart) == 0 && namePart.length > 0 && valPart.length > 0 ) {
             if ( valsMatched.indexOf(valPart) == -1 ) {
                numMatches++
                valsMatched.push(valPart);
             }
             //continue
          }
        }
        //return 0
      }

      if ( numMatches >= names.length ) {
         //console.log(numMatches + ' matches for ' + names.length + ' (' + name + ' , ' + val + ')')
         return 1
      }

      return 0

 };
 function descriptorshowAll() {

   descriptorclearSuggestionList();
   var iLen = descriptorsuggestions.length;
   var added = new Array();

   for (var i = 0; i < iLen; i++)
   {  
      var sug = descriptorsuggestions[i].trim()
      descriptoraddSuggestion(descriptorsuggestions[i]);
      added.push(descriptorsuggestions[i])
   }
   if ( iLen > 0 ) {
      descriptorinSuggest = true;
      descriptorshowSuggestions(true);
   }
 }

 function descriptorcalculateSuggestions()
 {
   var terms = descriptorinputEl.value.trim().toLowerCase().split(',');

   var searchterm = terms[terms.length-1].trim();
   
   if ( 0 == searchterm.length )
   {
      if ( !showList ) {
         descriptorhideSuggestions();
      } else {
         descriptorshowAll();
      }
      return;
   }

   var found = 0;
   descriptorclearSuggestionList();

   var added = new Array();
   var iLen = descriptorsuggestions.length;
   for (var i = 0; i < iLen; i++)
   {  
      var sug = descriptorsuggestions[i].trim().toLowerCase()
      if ( sug.indexOf(searchterm) == 0)
      {
         descriptoraddSuggestion(descriptorsuggestions[i]);
         added.push(descriptorsuggestions[i])
         found = 1;         
      }
   }

   var iLen = descriptorsuggestions.length;
   for (var i = 0; i < iLen; i++)
   {  
      var sug = descriptorsuggestions[i].trim().toLowerCase()
      if ( _isMatch(searchterm,sug) && added.indexOf(descriptorsuggestions[i]) == -1 )
      {
         descriptoraddSuggestion(descriptorsuggestions[i]);
         found = 1;         
      }
   }


   if ( descriptorcurrentSuggestionList.length == 1 )
   {
      if ( descriptorcurrentSuggestionList[0].innerHTML == searchterm )
      {
         found = 0;
         descriptorclearSuggestionList();
      }
   }
   descriptorinSuggest = found;
   descriptorshowSuggestions(found);

 }

 function descriptoraddSuggestion(name)
 {
     var elDiv =  document.createElement('div');
     elDiv.className = 'suggestion';
  
     elDiv.appendChild(document.createTextNode(name));
   
    elDiv.onmouseover = function(e) {
        this.className='suggestionsel';
        descriptorcurrentSuggestion = this;
    };
   
    elDiv.onmouseout = function(e) {
        this.className='suggestion';
    };
    elDiv.onclick = function(e) {
        descriptorchooseSuggestion(this);
    };
     descriptorsuggestionEl.appendChild(elDiv);
     descriptorcurrentSuggestionList.push(elDiv);
 }

 function descriptorclearSuggestionList () { 

  while(descriptorsuggestionEl.hasChildNodes())
  {
    descriptorsuggestionEl.removeChild(descriptorsuggestionEl.firstChild);
  }
  descriptorinSuggest = 0;
  descriptorcurrentSuggestion = null;
  descriptorcurrentSuggestionList = new Array();

 }

 function descriptorshowSuggestions(show) {
   did('searchsuggestions').style.visibility=show?'visible':'hidden';
 }

 function descriptorhideSuggestions() {
   did('searchsuggestions').style.visibility='hidden';
   descriptorclearSuggestionList();
 }

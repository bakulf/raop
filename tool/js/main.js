var App = {
  document: null,

  init: function() {
    // TODO: icon
    // TODO: the name

    this.retos = Retos;
  },

  // Menu definition ----------------------------------------------------------

  menuWelcome: function() {
    this.showPage('page-welcome');
  },

  menuCreate: function() {
    this.showPage('page-create');
  },

  menuUpload: function() {
    this.showPage('page-upload');
  },

  menuResume: function() {
    if (!("document" in localStorage)) {
      this.alert("No document in cache. Is this the first time that you use this app?");
      return;
    }

    var data = null;
    try {
      data = JSON.parse(localStorage.document);
    } catch(e) {
      this.alert("The document in cache is not valid. Sorry.");
      return;
    }

    if ("data" in data &&
        "retos" in data) {
      this.show(data);
      return;
    }

    this.alert("The document in cache is not valid. Sorry.");
  },

  menuDownload: function() {
    $('#modal-wait').modal('show');

    var self = this;
    setTimeout(function() {
      var request = $.ajax({
        url: Config.apiURL,
        type: 'POST',
        data: { toRDF: JSON.stringify(self.document) }
      });

      request.done(function(obj) {
        $('#modal-wait').modal('hide');

        if (typeof(obj) != 'object') {
          self.error();
          return;
        }

        if (obj.status != "success") {
          self.alert("Failed to serialize the output:<br/><strong>" + obj.error + "</strong>");
          return;
        }

        // TODO send the output to download
      });

      request.fail(function(obj) {
        self.error();
      });
    }, 1000);
  },

  menuSave: function() {
    this.save();
  },

  // Page manager ------------------------------------------------------------

  showPage: function(page) {
    $(".container").each(function(obj) {
      $(this).addClass('hide');
    });

    $("." + page).removeClass('hide');
  },

  // Sessions ----------------------------------------------------------------

  enableSaving: function() {
    var self = this;
    setTimeout(function() { self.save(); }, 20000 /* 20 secs */);

    this.save();

    var btn = document.getElementById("download");
    $(btn).removeClass('disabled');

    var btn = document.getElementById("save");
    $(btn).removeClass('disabled');
  },

  save: function() {
    var btn = document.getElementById("save");
    prevText = btn.innerHTML;
    btn.innerHTML = "Saving!";

    localStorage.document = JSON.stringify(this.document);

    setTimeout(function() {
      btn.innerHTML = prevText;
    }, 1000);
  },

  // Upload page -------------------------------------------------------------

  uploadDocument: function() {
    var text = document.getElementById("textarea_upload").value;
    if (text.length == 0) {
      this.alert("Please, insert some text.");
      return;
    }

    $('#modal-wait').modal('show');

    var self = this;
    setTimeout(function() {
      var request = $.ajax({
        url: Config.apiURL,
        type: 'POST',
        data: text
      });

      request.done(function(obj) {
        $('#modal-wait').modal('hide');

        if (typeof(obj) != 'object') {
          self.error();
          return;
        }

        if (obj.status != "success") {
          self.alert("Failed to parse the input:<br/><strong>" + obj.error + "</strong>");
          return;
        }

        self.show(obj.data);
      });

      request.fail(function(obj) {
        self.error();
      });
    }, 1000);
  },
  // Create Page -------------------------------------------------------------

  createDocument: function() {
    var text = document.getElementById("textarea_create").value;
    if (text.length == 0) {
      this.alert("Please, insert some text.");
      return;
    }

    $('#modal-wait').modal('show');

    var self = this;
    setTimeout(function() {
      self.parseDocument(text, function(obj) {
        self.show(obj);
        $('#modal-wait').modal('hide');
      }, self.error);
    }, 1000);
  },

  parseDocument: function(text, success, error) {
    var obj = [];
    var lines = text.split("\n");

    this.textIdIncremental = 0;

    for (var i = 0; i < lines.length; ++i) {
      obj.push(this.parseLine(i, lines[i]));
    }

    delete this.textIdIncremental;

    var data = {
      data: obj,
      retos: []
    };

    success(data);
  },

  parseLine: function(id, line) {
    var words = [];
    var w = '';

    for (var i = 0; i < line.length; ++i) {
      if ([' ', '\t', '\'', '\xB4', '.', ','].indexOf(line[i]) == -1) {
        w += line[i];
      } else {
        if ([' ', '\t'].indexOf(line[i]) == -1) {
          w += line[i];
        }

        if (w.length) {
          words.push({ textId: this.textIdIncremental++, data: w });
          w = '';
        }
      }
    }

    var data = {
      lineId: id,
      data: words
    };

    return data;
  },

  show: function(data) {
    this.showPage('page-document');

    this.document = data;
    this.enableSaving();

    this.showDocument(data.data);
    this.showRetos(data.retos);
  },

  showDocument: function(obj) {
    var div = document.getElementById('document');
    div.innerHTML = "";

    var self = this;

    for (var i = 0; i < obj.length; ++i) {
      var span = document.createElement('span');
      span.setAttribute('id', 'line-id-' + obj[i].lineId);
      span.setAttribute('data-line-id', obj[i].lineId);
      span.onclick = function() { self.lineClicked(this); }
      div.appendChild(span);

      var text = document.createTextNode("Line " + (obj[i].lineId) + ": ");
      span.appendChild(text);

      $(span).hover(function() {
        self.lineHighlightOn(this);
      }, function() {
        self.lineHighlightOff(this);
      });

      for (var j = 0; j <obj[i].data.length; ++j) {
        if (j != 0) {
          var text = document.createTextNode(" \xB7 ");
          div.appendChild(text);
        }

        var span = document.createElement('span');
        span.setAttribute('id', 'text-id-' + obj[i].data[j].textId);
        span.setAttribute('data-text-id', obj[i].data[j].textId);
        span.setAttribute('class', 'line-id-' + obj[i].lineId);
        span.onclick = function() { self.textClicked(this); }
        div.appendChild(span);

        var text = document.createTextNode(obj[i].data[j].data);
        span.appendChild(text);

        $(span).hover(function() {
          self.textHighlightOn(this);
        }, function() {
          self.textHighlightOff(this);
        });
      }

      var text = document.createTextNode(" \xB6");
      div.appendChild(text);

      var br = document.createElement('br');
      div.appendChild(br);
    }
  },

  lineHighlightOn: function(elm) {
    var id = elm.getAttribute('id');
    $("." + id).addClass("text-selected");
  },

  lineHighlightOff: function(elm) {
    var id = elm.getAttribute('id');
    $("." + id).removeClass("text-selected");
  },

  textHighlightOn: function(elm) {
    $(elm).addClass('text-selected');
  },

  textHighlightOff: function(elm) {
    $(elm).removeClass('text-selected');
  },

  lineClicked: function(elm) {
    if (this.customLineClickFnc) {
      this.customLineClickFnc(elm);
    }
  },

  textClicked: function(elm) {
    if (this.customTextClickFnc) {
      this.customTextClickFnc(elm);
    }
  },

  setCustomClickFnc: function(lineFnc, textFnc) {
    this.customLineClickFnc = lineFnc;
    this.customTextClickFnc = textFnc;
  },

  // Reto --------------------------------------------------------------------

  showRetos: function(obj) {
    var elm = document.getElementById("retos");
    elm.innerHTML = "";

    for (var i = 0; i < obj.length; ++i) {
      var e = this.createReto(obj[i]);
      this.retoResetHighlight(obj[i]);
      elm.appendChild(e);
    }
  },

  createReto: function(obj) {
    var self = this;

    var group = document.createElement('div');
    group.setAttribute('class', 'accordion-group');

    var header = document.createElement('div');
    header.setAttribute('class', 'accordion-heading');
    group.appendChild(header);

    var anchor = document.createElement('a');
    header.appendChild(anchor);
    anchor.setAttribute('href', '#reto-id-' + obj.retoId);
    anchor.setAttribute('class', 'accordion-toggle');
    anchor.setAttribute('data-toggle', 'collapse');
    anchor.setAttribute('data-parent', 'retos');

    $(anchor).hover(function() {
      self.retoHighlightOn(obj.retoId);
    }, function() {
      self.retoHighlightOff(obj.retoId);
    });

    var text = document.createTextNode('TODO ' + obj.retoId + ': ' + obj.type);
    anchor.appendChild(text);

    var body = document.createElement('div');
    body.setAttribute('class', 'accordion-body collapse');
    body.setAttribute('id', 'reto-id-' + obj.retoId);
    group.appendChild(body);

    var inner = document.createElement('inner');
    body.appendChild(inner);
    inner.setAttribute('class', 'accordion-inner');

    var reto = null;
    for (var i = 0; i < this.retos.length; ++i) {
      if (this.retos[i].name == obj.type) {
        reto = this.retos[i];
        break;
      }
    }

    if (!reto) {
      this.error();
      return;
    }

    var ul = document.createElement('ul');
    ul.setAttribute('class', 'reto-list');
    inner.appendChild(ul);

    for (var i = 0; "items" in reto && i < reto.items.length; ++i) {
      var e = this.retoItem(obj, reto.items[i], i);
      ul.appendChild(e);
    }

    var anchorDelete = document.createElement('a');
    anchorDelete.setAttribute('class', 'btn-primary btn');
    inner.appendChild(anchorDelete);

    anchorDelete.onclick = function() {
      self.retoDelete(obj.retoId);
    };

    var textDelete = document.createTextNode('delete');
    anchorDelete.appendChild(textDelete);

    return group;
  },

  retoItem: function(obj, item, itemId) {
    var li = document.createElement('li');

    var span = document.createElement('span');
    li.appendChild(span);

    function doLabel() {
      span.innerHTML = '';
      var text = document.createTextNode("Item: " + item.name + " (" + obj.items[itemId].length + ")");
      span.appendChild(text);
    }

    doLabel();

    $(li).hover(function() {
      self.retoItemHighlightOn(obj.retoId, itemId);
    }, function() {
      self.retoItemHighlightOff(obj.retoId, itemId);
    });

    var btn = document.createElement('a');
    btn.setAttribute('class', 'btn btn-small reto-btn');
    li.appendChild(btn);

    var text = document.createTextNode('edit');
    btn.appendChild(text);

    var btnGroup = document.createElement('div');
    btnGroup.setAttribute('class', 'btn-group hide');
    li.appendChild(btnGroup);

    var btnSave = document.createElement('a');
    btnSave.setAttribute('class', 'btn btn-small');
    btnGroup.appendChild(btnSave);

    var textSave = document.createTextNode('save');
    btnSave.appendChild(textSave);

    var btnCancel = document.createElement('a');
    btnCancel.setAttribute('class', 'btn btn-small');
    btnGroup.appendChild(btnCancel);

    var textCancel = document.createTextNode('cancel');
    btnCancel.appendChild(textCancel);

    var self = this;

    function doReset() {
      $(btnGroup).addClass('hide');
      $(btn).removeClass('hide');

      while (self.retoSelection.length) {
        if (self.retoSelection[0].type == 'line') {
          $("#line-id-" + self.retoSelection[0].id).removeClass("retoSelectionHighlight");
        }

        else if (self.retoSelection[0].type == 'text') {
          $("#text-id-" + self.retoSelection[0].id).removeClass("retoSelectionHighlight");
        }

        self.retoSelection.splice(0, 1);
      }

      self.setCustomClickFnc(null, null);
      self.retoSelection = null;
    }

    btn.onclick = function() {
      $(btnGroup).removeClass('hide');
      $(btn).addClass('hide');

      self.setCustomClickFnc(self.retoSelectionLineClicked,
                             self.retoSelectionTextClicked);
      self.retoSelection = [];
    }

    btnSave.onclick = function() {
      if (self.retoSelection.length == 0) {
        self.alert("A reto cannot be empty!");
        doReset();
        return;
      }

      // Cloning:
      var data = [];
      for (var i = 0; i < self.retoSelection.length; ++i) {
        data.push({ type: self.retoSelection[i].type,
                    id: self.retoSelection[i].id });
      }

      obj.items[itemId] = data;

      self.retoResetHighlight(obj);
      doLabel();
      doReset();
    }

    btnCancel.onclick = function() {
      doReset();
    }

    return li;
  },

  retoHighlightOn: function(id) {
    $(".reto-id-" + id).addClass("text-selected");
  },

  retoHighlightOff: function(id) {
    $(".reto-id-" + id).removeClass("text-selected");
  },

  retoItemHighlightOn: function(id, itemId) {
    $(".reto-id-" + id + '-item-' + itemId).addClass("text-selected");
  },

  retoItemHighlightOff: function(id, itemId) {
    $(".reto-id-" + id + '-item-' + itemId).removeClass("text-selected");
  },

  retoRemoveHighlight: function(obj) {
    this.retoHighlightOff(obj.retoId);

    $(".reto-id-" + obj.retoId).each(function() {
      $(this).removeClass("reto-id-" + obj.retoId);
    });

    for (var i = 0; i < obj.items.length; ++i) {
      this.retoItemHighlightOff(obj.retoId, i);

      $(".reto-id-" + obj.retoId + "-item-" + i).each(function() {
        $(this).removeClass("reto-id-" + obj.retoId + "-item-" + i);
      });
    }
  },

  retoResetHighlight: function(obj) {
    this.retoRemoveHighlight(obj);

    for (var i = 0; i < obj.items.length; ++i) {
      for (var j = 0; j < obj.items[i].length; ++j) {
        var o = obj.items[i][j];
        var id;

        if (o.type == 'text') {
          id = '#text-id-' + o.id;
        } else if (o.type == 'line') {
          id = '#line-id-' + o.id;
        }

        $(id).addClass('reto-id-' + obj.retoId);
        $(id).addClass('reto-id-' + obj.retoId + '-item-' + i);
      }
    }
  },

  retoSelectionLineClicked: function(elm) {
    var lineId = elm.getAttribute('data-line-id');

    for (var i = 0; i < this.retoSelection.length; ++i) {
      if (this.retoSelection[i].type == 'line' &&
          this.retoSelection[i].id == lineId) {
        this.retoSelection.splice(i, 1);
        $(elm).removeClass("retoSelectionHighlight");
        return;
      }
    }

    this.retoSelection.push({ type: 'line', id: lineId });
    $(elm).addClass("retoSelectionHighlight");
  },

  retoSelectionTextClicked: function(elm) {
    var textId = elm.getAttribute('data-text-id');

    for (var i = 0; i < this.retoSelection.length; ++i) {
      if (this.retoSelection[i].type == 'text' &&
          this.retoSelection[i].id == textId) {
        this.retoSelection.splice(i, 1);
        $(elm).removeClass("retoSelectionHighlight");
        return;
      }
    }

    this.retoSelection.push({ type: 'text', id: textId });
    $(elm).addClass("retoSelectionHighlight");
  },

  retoNew: function() {
    var select = document.getElementById("reto-select");
    select.innerHTML = "";

    for (var i = 0; i < this.retos.length; ++i) {
      var option = document.createElement('option');
      option.setAttribute('value', i);

      if (i == 0) {
        option.setAttribute("selected", "selected");
      }

      var text = document.createTextNode(this.retos[i].name);
      option.appendChild(text);

      select.appendChild(option);
    }

    $('#modal-reto').modal('show');
    this.retoSelectChanged();
  },

  retoDelete: function(id) {
    if (!confirm("Do you want to delete this TODO?")) {
      return;
    }

    for (var i = 0; i < this.document.retos.length; ++i) {
      if (this.document.retos[i].retoId == id) {
        this.retoRemoveHighlight(this.document.retos[i]);
        this.document.retos.splice(i, 1);
        this.showRetos(this.document.retos);
        return;
      }
    }
  },

  retoSelectChanged: function() {
    var id = $("#reto-select").val();
    var p = document.getElementById("reto-description").innerHTML = this.retos[id].description;
  },

  retoCreate: function() {
    var max = 0;
    for (var i = 0; i < this.document.retos.length; ++i) {
      if (this.document.retos[i].retoId > max) {
        max = this.document.retos[i].retoId;
      }
    }

    var id = $("#reto-select").val();

    var items = [];
    for (var i = 0; i < this.retos[id].items.length; ++i) {
      items.push([]);
    }

    var data = { retoId: max + 1, type: this.retos[id].name, items: items };

    this.document.retos.push(data);
    this.showRetos(this.document.retos);

    $("#reto-id-" + (max + 1)).collapse('show');
  },

  // Alerts/Errors ------------------------------------------------------------

  alert: function(msg) {
    $("#alert-text").html(msg);
    $('#modal-alert').modal('show');
  },

  error: function() {
    $('#modal-wait').modal('hide');
    alert("Something wrong happened!");
  }
};

App.init();

'use strict';

var AnnotationTool = require('substance/ui/AnnotationTool');
var documentHelpers = require('substance/model/documentHelpers');

/**
 * A link tool used instead of `substance/packages/link/EditLinkTool`
 * It implements both the on/off of the link annotation as well
 * as it's editing
 *
 * @class      LinkTool (name)
 */
function LinkTool() {
  LinkTool.super.apply(this, arguments);
}

LinkTool.Prototype = function() {

  var _super = LinkTool.super.prototype;

  this.render = function($$) {
    var el = _super.render.call(this, $$)
      .addClass('sc-link-tool');

    if (this.props.active) {
      var session = this.context.documentSession;
      var link = documentHelpers.getPropertyAnnotationsForSelection(session.getDocument(), session.getSelection(), {
        type: 'link'
      })[0];

      el.append(
        $$('input')
          .attr({
            value: link.url,
            placeholder: 'Paste or type a URL'
          })
          .on('change', function(event){
            // FIXME
            // This transaction does not appear in the document content
            // until after some other user action there.
            session.transaction(function(tx) {
              tx.set([link.id, 'url'], event.target.value);
            });
          })

        // Link to open the URL (unecessary? as thus currently not implemented)
        /*
        $$('a')
          .attr({
            href: link.url,
            title: 'Open link',
            target: '_blank'
          })
          .append('O')
        */
      );

    }

    return el;
  };

};

AnnotationTool.extend(LinkTool);

module.exports = LinkTool;

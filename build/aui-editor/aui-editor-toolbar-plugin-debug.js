AUI.add('aui-editor-toolbar-plugin', function(A) {
var Lang = A.Lang,
	isFunction = Lang.isFunction,

	getClassName = A.ClassNameManager.getClassName,

	NAME = 'editortoolbar',
	TOOLBAR_PLUGIN = 'toolbar',

	ALIGNMENT = 'alignment',
	COLOR = 'color',
	CONTENT = 'content',
	FONT = 'font',
	INDENT = 'indent',
	INPUT = 'input',
	INSERT = 'insert',
	INSERTIMAGE = 'insertimage',
	LIST = 'list',
	MOUSEOUT = 'mouseout',
	SELECT = 'select',
	SOURCE = 'source',
	STYLES = 'styles',
	SUBSCRIPT = 'subscript',
	TEXT = 'text',

	CMD_IGNORE = {
		backcolor: true,
		forecolor: true,
		format: true,
		insertimage: true,
		source: true,
		styles: true
	},

	CMD_FORMAT = [
		'b',
		'big',
		'font',
		'em',
		'i',
		'small',
		's',
		'strike',
		'strong',
		'sub',
		'sup',
		'u'
	],

	CSS_BUTTON_HOLDER = getClassName('button', 'holder'),
	CSS_FIELD_INPUT = getClassName('field', INPUT),
	CSS_FIELD_INPUT_TEXT = getClassName('field', INPUT, 'text'),
	CSS_FIELD_LABEL = getClassName('field', 'label'),
	CSS_FIELD_NUMERIC = getClassName('field', 'numeric'),
	CSS_INSERTIMAGE = getClassName(NAME, INSERTIMAGE),
	CSS_SELECT_FONTNAME = getClassName(NAME, SELECT, 'fontname'),
	CSS_SELECT_FONTSIZE = getClassName(NAME, SELECT, 'fontsize'),
	CSS_SIZE_SEPARATOR = getClassName(NAME, 'size', 'separator'),
	CSS_SOURCE_TEXTAREA = getClassName(NAME, SOURCE, 'textarea'),
	CSS_STATE_ACTIVE = getClassName('state', 'active'),
	CSS_TOOLBAR = getClassName(NAME),
	CSS_TOOLBAR_CONTENT = getClassName(NAME, CONTENT),

	TPL_INSERTIMAGE_HREF = '<a></a>',
	TPL_INSERTIMAGE_IMG = '<img />',

	TPL_SOURCE_TEXTAREA = '<textarea class="' + CSS_SOURCE_TEXTAREA + '"></textarea>',

	TPL_TOOLBAR = '<div class="' + CSS_TOOLBAR + '"><div class="' + CSS_TOOLBAR_CONTENT + '"></div></div>',

	TPL_TOOLBAR_BUTTON_HOLDER = '<div class="' + CSS_BUTTON_HOLDER + '"></div>',

	TPL_TOOLBAR_FONTNAME = '<select class="' + CSS_SELECT_FONTNAME + '">{0}</select>',

	TPL_TOOLBAR_FONTNAME_OPTION = '<option selected="selected"></option>' +
								'<option>Arial</option>' +
								'<option>Arial Black</option>' +
								'<option>Comic Sans MS</option>' +
								'<option>Courier New</option>' +
								'<option>Lucida Console</option>' +
								'<option>Tahoma</option>' +
								'<option>Times New Roman</option>' +
								'<option>Trebuchet MS</option>' +
								'<option>Verdana</option>',

	TPL_TOOLBAR_FONTSIZE = '<select class="' + CSS_SELECT_FONTSIZE + '">{0}</select>',

	TPL_TOOLBAR_FONTSIZE_OPTION = '<option selected="selected"></option>' +
								'<option value="1">10</option>' +
								'<option value="2">13</option>' +
								'<option value="3">16</option>' +
								'<option value="4">18</option>' +
								'<option value="5">24</option>' +
								'<option value="6">32</option>' +
								'<option value="7">48</option>',

	TPL_TOOLBAR_SIZE_SEPARATOR = '<span class="' + CSS_SIZE_SEPARATOR + '">x</span>';

var EditorToolbar = A.Component.create(
	{
		NAME: NAME,

		NS: TOOLBAR_PLUGIN,

		EXTENDS: A.Plugin.Base,

		ATTRS: {
			groups: {
				value: [
					{
						type: TEXT
					},
					{
						type: ALIGNMENT
					},
					{
						type: INDENT
					},
					{
						type: LIST
					}
				]
			}
		},

		prototype: {
			initializer: function() {
				var instance = this;

				var host = instance.get('host');
				var container = host.frame.get('container');
				var groups = instance.get('groups');

				var boundingBox = A.Node.create(TPL_TOOLBAR);
				var contentBox = boundingBox.one('.' + CSS_TOOLBAR_CONTENT);

				container.placeBefore(boundingBox);

				var attrs = {
					boundingBox: boundingBox,
					contentBox: contentBox
				};

				var toolbars = [];

				instance.on(
					'buttonitem:click',
					function(event) {
						var instance = this;

						var cmds = event.target.get('icon').split('-');

						if (!CMD_IGNORE[cmds[0]]) {
							instance.execCommand(cmds[0], (cmds[1] ? cmds[1] : ''));
							instance.focus();
						}
					},
					host
				);

				for (var i = 0; i < groups.length; i++) {
					var group = groups[i];
					var groupType = GROUPS[group.type];
					var toolbar;

					var children = [];

					for (var j = 0; j < groupType.children.length; j++) {
						if (!groupType.children[j].select) {
							children.push(groupType.children[j]);
						}
					}

					if (children.length > 0) {
						toolbar = new A.Toolbar(
							A.merge(
								groupType.config,
								group.toolbar,
								{
									children: children
								}
							)
						).render(contentBox);

						toolbar.addTarget(instance);

						toolbars.push(toolbar);
					}

					var generate = groupType.generate;

					if (generate && isFunction(generate.init)) {
						generate.init.call(instance, host, attrs);
					}

					for (var j = 0; j < groupType.children.length; j++) {
						var item = groupType.children[j];
						var icon = item.icon;

						if (generate && isFunction(generate[icon])) {
							var config = (group.config ? group.config[icon] : null);

							attrs.button = (item.select || !toolbar ? null : toolbar.item(j));

							generate[icon].call(instance, host, attrs, config);
						}
					}
				}

				attrs.toolbars = toolbars;
			},

			_updateToolbar: function(event, attrs) {
				var instance = this;

				if (event.changedNode) {
					var cmds = event.commands;
					var toolbars = attrs.toolbars;

					var toolbarIterator = function(item, index, collection) {
						var state = !!(cmds[item.get('icon')]);

						item.StateInteraction.set('active', state);
					};

					if (toolbars) {
						for (var i = 0; i < toolbars.length; i++) {
							toolbars[i].each(toolbarIterator);
						}
					}

					var fontName = event.fontFamily;
					var fontNameOptions = attrs._fontNameOptions;
					var fontSize = event.fontSize;
					var fontSizeOptions = attrs._fontSizeOptions;

					if (fontNameOptions) {
						fontNameOptions.item(0).set('selected', true);

						fontNameOptions.each(
							function(item, index, collection) {
								var val = item.get('value').toLowerCase();

								if (val === fontName.toLowerCase()) {
									item.set('selected', true);
								}
							}
						);
					}

					if (fontSizeOptions) {
						fontSize = fontSize.replace('px', '');

						fontSizeOptions.item(0).set('selected', true);

						fontSizeOptions.each(
							function(item, index, collection) {
								var val = item.get('value').toLowerCase();
								var txt = item.get('text');

								if (txt === fontSize) {
									item.set('selected', true);
								}
							}
						);
					}
				}
			}
		}
	}
);

EditorToolbar.generateOverlay = function(trigger, config) {
	var overlay = new A.OverlayContext(
		A.merge(
			{
				align: {
					node: trigger,
					points: [ 'tl', 'bl' ]
				},
				hideOn: 'click',
				showOn: 'click',
				trigger: trigger
			},
			config
		)
	).render();

	return overlay;
};

EditorToolbar.generateColorPicker = function(editor, attrs, config, cmd) {
	var button = attrs.button;
	var boundingBox = button.get('boundingBox');

	var colorPicker = new A.ColorPicker(
		A.merge(
			{
				align: {
					node: boundingBox,
					points: ['tl', 'bl']
				},
				trigger: boundingBox
			},
			config
		)
	);

	if (config && config.plugins) {
		for (var i = 0; i < config.plugins.length; i++) {
			colorPicker.plug(config.plugins[i], config);
		}
	}

	colorPicker.render(A.getBody());

	colorPicker.on(
		'colorChange',
		function(event) {
			var instance = this;

			var rgb = colorPicker.get('rgb');

			editor.execCommand(cmd, rgb.hex);
			editor.focus();
		}
	);
};

EditorToolbar.STRINGS = {
	ALIGN: 'Align',
	ALIGN_BLOCK: 'Block',
	ALIGN_LEFT: 'Left',
	ALIGN_INLINE: 'Inline',
	ALIGN_RIGHT: 'Right',
	BACKCOLOR: 'Background Color',
	BOLD: 'Bold',
	BORDER: 'Border',
	CREATE_LINK: 'Create Link',
	DESCRIPTION: 'Description',
	FORECOLOR: 'Foreground Color',
	IMAGE_URL: 'Image URL',
	INDENT: 'Indent',
	INSERT: 'Insert',
	INSERT_IMAGE: 'Insert Image',
	INSERT_ORDERED_LIST: 'Insert Numbered List',
	INSERT_UNORDERED_LIST: 'Insert Bulleted List',
	ITALIC: 'Italic',
	JUSTIFY_LEFT: 'Justify Left',
	JUSTIFY_CENTER: 'Justify Center',
	JUSTIFY_RIGHT: 'Justify Right',
	LINK_URL: 'Link URL',
	OPEN_IN_NEW_WINDOW: 'Open in new window',
	OUTDENT: 'Outdent',
	PADDING: 'Padding',
	REMOVE_FORMAT: 'Format Source',
	SIZE: 'Size',
	SOURCE: 'Source',
	SUBSCRIPT: 'Subscript',
	SUPERSCRIPT: 'Superscript',
	LINE_THROUGH: 'Line Through',
	UNDERLINE: 'Underline'
};

GROUPS = {};

GROUPS[ALIGNMENT] = {
	children: [
		{
			icon: 'justifyleft',
			title: EditorToolbar.STRINGS.JUSTIFY_LEFT
		},
		{
			icon: 'justifycenter',
			title: EditorToolbar.STRINGS.JUSTIFY_CENTER
		},
		{
			icon: 'justifyright',
			title: EditorToolbar.STRINGS.JUSTIFY_RIGHT
		}
	]
};

GROUPS[COLOR] = {
	children: [
		{
			icon: 'forecolor',
			title: EditorToolbar.STRINGS.FORECOLOR
		},
		{
			icon: 'backcolor',
			title: EditorToolbar.STRINGS.BACKCOLOR
		}
	],
	generate: {
		forecolor: function(editor, attrs, config) {
			var instance = this;

			EditorToolbar.generateColorPicker(editor, attrs, config, 'forecolor');
		},

		backcolor: function(editor, attrs, config) {
			var instance = this;

			EditorToolbar.generateColorPicker(editor, attrs, config, 'backcolor');
		}
	}
};

GROUPS[FONT] = {
	children: [
		{
			icon: 'fontname',
			select: true
		},
		{
			icon: 'fontsize',
			select: true
		}
	],

	generate: {
		init: function(editor, attrs) {
			var instance = this;

			var contentBox = attrs.contentBox;

			A.delegate(
				'change',
				function(event) {
					var instance = this;

					var target = event.currentTarget;
					var css = target.get('className');
					var cmd = css.substring(css.lastIndexOf('-') + 1);
					var val = target.get('value');

					editor.execCommand(cmd, val);
					editor.focus();
				},
				contentBox,
				'select'
			);

			editor.after(
				'nodeChange',
				function(event) {
					var instance = this;

					switch (event.changedType) {
						case 'keyup':
						case 'mousedown':
							instance._updateToolbar(event, attrs);
						break;
					}
				},
				instance
			);
		},

		fontname: function(editor, attrs, config) {
			var instance = this;

			var contentBox = attrs.contentBox;

			var tpl;
			var data = [TPL_TOOLBAR_FONTNAME_OPTION];

			if (config && config.optionHtml) {
				data[0] = config.optionHtml;
			}

			tpl = Lang.sub(TPL_TOOLBAR_FONTNAME, data);

			contentBox.append(tpl);

			var options = contentBox.all('.' + CSS_SELECT_FONTNAME + ' option');

			attrs._fontNameOptions = options;
		},

		fontsize: function(editor, attrs, config) {
			var instance = this;

			var contentBox = attrs.contentBox;

			var tpl;
			var data = [TPL_TOOLBAR_FONTSIZE_OPTION];

			if (config && config.optionHtml) {
				data[0] = config.optionHtml;
			}

			tpl = Lang.sub(TPL_TOOLBAR_FONTSIZE, data);

			contentBox.append(tpl);

			var options = contentBox.all('.' + CSS_SELECT_FONTSIZE + ' option');

			attrs._fontSizeOptions = options;
		}
	}
};

GROUPS[INDENT] = {
	children: [
		{
			icon: 'indent',
			title: EditorToolbar.STRINGS.INDENT
		},
		{
			icon: 'outdent',
			title: EditorToolbar.STRINGS.OUTDENT
		}
	]
};

GROUPS[INSERT] = {
	children: [
		{
			icon: 'insertimage',
			title: EditorToolbar.STRINGS.INSERT_IMAGE
		},
		{
			icon: 'createlink',
			title: EditorToolbar.STRINGS.CREATE_LINK
		}
	],
	generate: {
		insertimage: function(editor, attrs, config) {
			var instance = this;

			var button = attrs.button;
			var boundingBox = button.get('boundingBox');

			var overlay = EditorToolbar.generateOverlay(boundingBox, config);

			var contextBox = overlay.get('contentBox');

			var panel = new A.Panel(
				{
					collapsible: false,
					headerContent: EditorToolbar.STRINGS.INSERT_IMAGE,
					icons: [
						{
							icon: 'close',
							handler: {
								fn: overlay.hide,
								context: overlay
							}
						}
					]
				}
			).render(contextBox);

			contextBox = panel.bodyNode;

			if (config && config.dataBrowser) {
				config.dataBrowser.render(contextBox);
			}
			else {
				var frame = editor.getInstance();
				var iframe = editor.frame._iframe;

				var selection = null;

				var imageForm = new A.Form(
					{
						cssClass: CSS_INSERTIMAGE,
						labelAlign: 'left'
					}
				).render(contextBox);

				var borderOptions = [
					{
						labelText: 'none',
						value: ''
					}
				];

				for (var i = 1; i < 6; i++) {
					borderOptions.push(
						{
							labelText: i + 'px',
							value: i + 'px solid'
						}
					);
				}

				imageForm.add(
					[
						{
							id: 'imageURL',
							labelText: EditorToolbar.STRINGS.IMAGE_URL
						},
						{
							id: 'size',
							labelText: EditorToolbar.STRINGS.SIZE,
							type: 'hidden'
						},
						{
							id: 'width',
							labelText: false,
							cssClass: CSS_FIELD_NUMERIC
						},
						{
							id: 'height',
							labelText: false,
							cssClass: CSS_FIELD_NUMERIC
						},
						{
							id: 'padding',
							labelText: EditorToolbar.STRINGS.PADDING
						},
						new A.Select(
							{
								id: 'border',
								labelText: EditorToolbar.STRINGS.BORDER,
								options: borderOptions
							}
						),
						{
							id: 'align',
							labelText: EditorToolbar.STRINGS.ALIGN,
							type: 'hidden'
						},
						{
							id: 'description',
							labelText: EditorToolbar.STRINGS.DESCRIPTION
						},
						{
							id: 'linkURL',
							labelText: EditorToolbar.STRINGS.LINK_URL
						},
						{
							id: 'openInNewWindow',
							labelText: EditorToolbar.STRINGS.OPEN_IN_NEW_WINDOW,
							type: 'checkbox'
						}
					],
					true
				);

				imageForm.getField('width').get('boundingBox').placeAfter(TPL_TOOLBAR_SIZE_SEPARATOR);

				var imageFormContentBox = imageForm.get('contentBox');
				var buttonRow = A.Node.create(TPL_TOOLBAR_BUTTON_HOLDER);

				var hrefTarget = imageForm.getField('openInNewWindow');

				var toolbar = new A.ButtonItem(
					{
						icon: 'circle-check',
						label: EditorToolbar.STRINGS.INSERT
					}
				).render(buttonRow);

				var imgSizeDetection = A.Node.create(TPL_INSERTIMAGE_IMG);

				var heightField = imageForm.getField('height');
				var widthField = imageForm.getField('width');

				imgSizeDetection.on(
					'load',
					function(event) {
						var img = event.currentTarget;

						if (!heightField.get('value') || !widthField.get('value')) {
							imageForm.set(
								'values',
								{
									height: img.get('height'),
									width: img.get('width')
								}
							);
						}
					}
				);

				imageForm.getField('imageURL').get('node').on(
					'blur',
					function(event) {
						imgSizeDetection.set('src', this.val());
					}
				);

				toolbar.on(
					'click',
					function(event) {
						var instance = this;

						var img = A.Node.create(TPL_INSERTIMAGE_IMG);

						var fieldValues = imageForm.get('fieldValues');

						var description = fieldValues.description;

						var imgAttrs = {
							src: fieldValues.imageURL,
							title: description,
							alt: description
						};

						var imgStyles = {
							border: fieldValues.border
						};

						var height = parseInt(fieldValues.height, 10);
						var width = parseInt(fieldValues.width, 10);

						if (!isNaN(height)) {
							imgAttrs.height = height;
						}

						if (!isNaN(width)) {
							imgAttrs.width = width;
						}

						var padding = parseInt(fieldValues.padding, 10);

						if (!isNaN(padding)) {
							imgStyles.padding = padding;
						}

						toolbarAlign.some(
							function(item, index, collection) {
								var instance = this;

								var active = item.StateInteraction.get('active');

								if (active) {
									imgStyles.display = '';

									switch(index) {
										case 0:
											imgAttrs.align = 'left';
										break;

										case 1:
											imgAttrs.align = '';
										break;

										case 2:
											imgAttrs.align = 'center';
											imgStyles.display = 'block';
										break;

										case 3:
											imgAttrs.align = 'right';
										break;
									}

									return true;
								}
							}
						);

						img.attr(imgAttrs);
						img.setStyles(imgStyles);

						var linkURL = fieldValues.linkURL;

						if (linkURL) {
							var href = A.Node.create(TPL_INSERTIMAGE_HREF);

							href.attr('href', linkURL);

							if (hrefTarget.get('node').get('checked')) {
								href.attr('target', '_blank');
							}

							href.append(img);

							img = href;
						}

						if (selection && selection.anchorNode) {
							selection.anchorNode.append(img);
						}

						overlay.hide();
					}
				);

				imageFormContentBox.append(buttonRow);

				var toolbarAlign = new A.Toolbar(
					{
						activeState: true,
						children: [
							{
								icon: 'align-left',
								title: EditorToolbar.STRINGS.ALIGN_LEFT
							},
							{
								icon: 'align-inline',
								title: EditorToolbar.STRINGS.ALIGN_INLINE
							},
							{
								icon: 'align-block',
								title: EditorToolbar.STRINGS.ALIGN_BLOCK
							},
							{
								icon: 'align-right',
								title: EditorToolbar.STRINGS.ALIGN_RIGHT
							}
						]
					}
				);

				toolbarAlign.after(
					'buttonitem:click',
					function(event) {
						var button = event.target;

						toolbarAlign.each(
							function(item, index, collection) {
								if (item != button) {
									item.StateInteraction.set('active', false);
								}
							}
						);
					}
				);

				toolbarAlign.render(imageForm.getField('align').get('contentBox'));

				overlay.after(
					'hide',
					function(event) {
						imageForm.resetValues();

						toolbarAlign.each(
							function(item, index, collection) {
								item.StateInteraction.set('active', false);
							}
						);

						hrefTarget.get('node').set('checked', false);
					}
				);

				iframe.on(
					MOUSEOUT,
					function(event) {
						var frame = editor.getInstance();

						selection = new frame.Selection();
					}
				);
			}
		},

		createlink: function(editor, attrs, config) {
			var instance = this;

			editor.plug(A.Plugin.CreateLinkBase);
		}
	}
};

GROUPS[LIST] = {
	children: [
		{
			icon: 'insertunorderedlist',
			title: EditorToolbar.STRINGS.INSERT_UNORDERED_LIST
		},
		{
			icon: 'insertorderedlist',
			title: EditorToolbar.STRINGS.INSERT_ORDERED_LIST
		}
	],
	generate: {
		init: function(editor) {
			var instance = this;

			editor.plug(A.Plugin.EditorLists);
		}
	}
};

GROUPS[SOURCE] = {
	children: [
		{
			icon: 'format',
			title: EditorToolbar.STRINGS.REMOVE_FORMAT
		},
		{
			icon: 'source',
			title: EditorToolbar.STRINGS.SOURCE
		}
	],
	generate: {
		format: function(editor, attrs, config) {
			var instance = this;

			var frame = editor.frame;
			var button = attrs.button;

			button.on(
				'click',
				function(event) {
					var instance = this;

					var frame = instance.getInstance();

					var selection = new frame.Selection();
					var items = selection.getSelected();

					if (!selection.isCollapsed && items.size()) {
						items.each(
							function(item, index, collection) {
								var instance = this;

								item.removeAttribute('style');

								var html = item.get('innerHTML');

								html = html.replace(/<([a-zA-Z0-9]*)\b[^>]*>/g, '<$1>');

								for (var i = 0; i < CMD_FORMAT.length; i++) {
									var regExp = new RegExp('(<' + CMD_FORMAT[i] + '>|<\\/' + CMD_FORMAT[i] + '>)', 'ig');

									html = html.replace(regExp, '');
								}

								item.set('innerHTML', html);

								var parent = item.get('parentNode');

								if (!parent.test('body')) {
									parent.removeAttribute('style');
								}
							}
						);
					}
				},
				editor
			);
		},

		source: function(editor, attrs, config) {
			var instance = this;

			var frame = editor.frame;
			var container = frame.get('container');

			var contentBox = attrs.contentBox;
			var button = attrs.button;

			var textarea = A.Node.create(TPL_SOURCE_TEXTAREA);

			textarea.hide();

			container.append(textarea);

			button._visible = false;

			button.on(
				'click',
				function(event) {
					var buttonVisible = button._visible;

					if (buttonVisible) {
						editor.set('content', textarea.val());

						textarea.hide();
						textarea.val('');

						frame.show();
					}
					else {
						var iframe = frame._iframe;

						textarea.val(editor.getContent());

						var offsetHeight = iframe.get('offsetHeight') - textarea.getPadding('tb');

						textarea.setStyle('height', offsetHeight);

						frame.hide();

						textarea.show();
					}

					buttonVisible = !buttonVisible;

					button._visible = buttonVisible;

					contentBox.all('select').attr('disabled', buttonVisible);
					contentBox.all('button').attr('disabled', buttonVisible);

					button.get('contentBox').attr('disabled', false);
				}
			);
		}
	}
};

GROUPS[STYLES] = {
	children: [
		{
			icon: 'styles'
		}
	],
	generate: {
		styles: function(editor, attrs, config) {
			var instance = this;

			var button = attrs.button;
			var boundingBox = button.get('boundingBox');

			editor.plug(A.Plugin.EditorMenu);

			editor.menu.add(
				A.merge(
					{
						align: {
							node: boundingBox,
							points: ['tl', 'bl']
						},
						hideOn: 'click',
						showOn: 'click',
						trigger: boundingBox
					},
					config
				)
			);
		}
	}
};

GROUPS[SUBSCRIPT] = {
	children: [
		{
			icon: 'subscript',
			title: EditorToolbar.STRINGS.SUBSCRIPT
		},
		{
			icon: 'superscript',
			title: EditorToolbar.STRINGS.SUPERSCRIPT
		}
	]
};

GROUPS[TEXT] = {
	children: [
		{
			icon: 'bold',
			title: EditorToolbar.STRINGS.BOLD
		},
		{
			icon: 'italic',
			title: EditorToolbar.STRINGS.ITALIC
		},
		{
			icon: 'underline',
			title: EditorToolbar.STRINGS.UNDERLINE
		},
		{
			icon: 'strikethrough',
			title: EditorToolbar.STRINGS.LINE_THROUGH
		}
	]
};

A.namespace('Plugin').EditorToolbar = EditorToolbar;

}, '@VERSION@' ,{requires:['aui-base','aui-button-item','aui-color-picker','aui-editor-menu-plugin','aui-editor-tools-plugin','aui-form-select','aui-overlay-context','aui-panel','aui-toolbar','createlink-base','editor-lists','editor-base','plugin']});
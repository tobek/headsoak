var gui = require('nw.gui');

var menu = new gui.Menu({ type: 'menubar' });

menu.createMacBuiltin('nutmeg', {
  hideWindow: true
});

// // Create sub-menu
// var menuItems = new gui.Menu();
// var menuItem = new gui.MenuItem({ label: 'Custom Menu Item 1' });
// menuItem.click = function() { alert('nice!'); };
// menuItems.append(menuItem);

// menu.insert(
//   new gui.MenuItem({
//     label: 'Custom Menu Label',
//     submenu: menuItems
//   })
// , 1);

// Append Menu to Window
gui.Window.get().menu = menu;
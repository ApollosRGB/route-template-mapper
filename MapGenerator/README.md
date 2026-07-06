# SYNAOS Map Editor

This standalone project is used to create topological maps for the SYNAOS IMP ecosystem.

## Table of Contents

1. [Requirements](#Requirements)
2. [Map Editor](#Map-Editor)
3. [Map Converter](#Map-Converter)
4. [FAQ](#FAQ)

## Requirements

To be able to run the application you either have to install Python (version >= 3.8) together with a few packages our you can use the
executable to directly dive into editing without the need to install anything.

#### Packages to install:

```bash
pip install -r requirements.txt
```

##### Inlcudes

- PySimpleGUI
- Matplotlib
- Numpy
- Scipy
- geomdl
- svgwrtie
- shapely
- (Tkinter - only for Ubuntu user)

## Map Editor

The map editor is a GUI to enable a quick and easy way to use the functionalities of the Map Generatorr Editor.
The Map Generator Editor brings in a lot of funcitionalities to create, edit and delete all informations of the a
SYANOS map file. This starts by simple placement of new nodes, over adding informations like emergency bays and charging
stations as well as advanced features like moving nodes via Drag & Drop or automated edge split according to a edge
length limit

#### Start of the Editor

- **Python**: If python and all necessary packages mentioned in the section above are correctly installed the user only
  needs to run `python MapEditor.py ` or `python3 MapEditor.py`. The initial pop up to set the size of the map. If no
  predefined map size is desired, the window can be skipped by pressing 'Ok' without entering a size. The actual editor
  the default or desired map size opens.

#### Overview of the Editor

Detailed explanation of UI coming soon!

#### Navigation in the Editor

- **Zoom View**: To to zoom in and out of the current map the user can use to mouse wheel. The view will be zoomed in
  or out at the current position of the mouse cursor.

- **Move View**: To move the view the user can either use the 'arrow' keys on the keyboard or 'drag & drop' the view by
  holding down the left mouse button and dragging the view in any desired direction.
  > **Hint:**
  > Dragging the view only works if no node is selected.

#### Adding Nodes

To add a new node to the map there are different possibilities:

- **Right mouse button**: Whit an easy press of the right mouse button you create a new node at the current mouse cursor
  position. The node will get a currently unused ID between 0000 and 9999. If there is already a node at the current
  cursor position no new node will be create. The user will get a pop up informing the user, that there is already a node
  at this location.

- **Shortcut 'N'**: By pressing 'N' on the keyboard the 'Create new node' mask will pop up, allowing you to enter x and
  y coordinates as well as a custom node ID. Keep in mind that the ID must be unique. Furthermore you can add a vendor,
  AGV type and VDA ID to allow SYNA.OS to send out the AGV and vendor specific IDs instead of the internal IDs of the node.

#### Adding Edges

To add edges to the map you have to create connections between nodes.

- **Drag & Drop**: It is as easy as it sounds. To create a new edge the user needs at least one node. Select the
  starting node of the edge with the left mouse button. By pressing the right mouse button once again and holding down on
  the button, the user can now drag the new edge to the desired location. By realising the mouse button the new edge is
  created. If you release the mouse button while hovering over or near an already existing node the edge will be created
  between the select and this current node.
  > **Tip:**
  > In the options the user can enable the functionality to allow intersecting edges.
- **Edge Mode**: By clicking on the button 'Edge Mode' on the right hand side of the screen the user can activate the
  edge mode of the editor. While active the user can create edges by selecting two nodes in sequence. The edge is directed
  from the first selected node to the second selected node. If the edge already exists a pop up will inform the user, that
  this edge does already exist and cannot be created. After selecting the first node a virtual red edge will appear,
  indicating the new edge that the user currently creates.

#### Deleting Nodes

Deleting a node can be achieved by selecting a node with the left mouse button. While the node is selected the user can
delete the node with pressing 'Del' on the keyboard. The node as well as all edges leading to or from this node will be
deleted.

#### Deleting Edges

Deleting an edge can be achieved by selecting an edge with the left mouse button. While the edge is selected the user
can delete the edge with pressing 'Del' on the keyboard. The edge will be deleted while the start and end node remain.

#### Deleting Map / Starting New Map

To delete all nodes and edges currently shown in the map the user can press 'Esc' on the keyboard. A pop up will appear,
asking the user if he really wants to delete the hole map. If the user confirms this pop up all nodes and edges as well
the background will be permanently deleted.

#### Edit Nodes

- **ID**: To change the ID of node simply double click the node with the left mouse button. A pop up window will appear.
  Changing the ID can be achieved by entering the desired ID into the input field and pressing the 'Ok' button to confirm
  the change of the ID. The editor will check the ID before changing it. If the selected ID is already used for another
  node the ID of the selected node will not be changed.

- **Coordinates**:

  - _Node pop up_: To change the coordinates of a node to a specific value double click the node with the left mouse
    button. A pop up window will appear. Simply entering the desired values

  - _Drag & Drop_: It is also possible to change the position easily via Drag & Drop. To do so the user has to select
    one node with the left mouse button. After the node is selected (yellow) the user need to click and hold down the
    left mouse button on the node once again. By moving the mouse the node is moved accordingly (indicated via a red
    virtual node). After releasing the left mouse button the selected node is permanently moved to the new location.

> **Tip 1:**
> By enabling the grid options (see section "Options") it is way easier to set a specific coordinate while dragging the node.

> **Tip 2:**
> By locking the node via the button "Lock Nodes" on the right hand side of the editor, the user can disable the
> functionality to change the position of nodes via "Drag & Drop". The position of nodes can still be changed by directly
> editing the coordinates in the node pop up window.

- **Node Types**:
  - _Add_:
  - _Delete_:
  - _Edit_:

#### Edit Edges

- **ID**:

#### Edit Node Relations

Explanation coming soon!

#### Edit Reservation Dependencies

Explanation coming soon!

#### Open Map

To open and edit an already existing map the user can open a file selector mask by clicking on the 'Open' button in the
section 'Map'. A file selector mask opens and the user can selected an already existing map in JSON-format. Note that
only maps that are compliant to the SYNAOS map schema can be opened in the editor. The selected replaces the currently
active map.

> **Hint 1:**
> All currently set nodes and edges will be permanently deleted from the editor. Currently it is not possible no join to
> maps via the editor. Please ensure that all previously made changes are saved before opening another map.

> **Hint 2:**
> To open maps from other sources (e. g. SIEMENS) use the import functionality.

#### Save Map

To save the current map of the editor the user can open a file selector mask by clicking on the 'Save' button in the
section 'Map'. A file selector mask opens and the user can either select an existing map file or create a new one by
typing in the new name of the map in the mask. By confirming the mask the map will be saved to the selected directory.
If the user selected an already existing map the user has to confirm once again, that he really once to override the
existing map in the selected file.

#### Edit Map

- Reset Dependencies
- Reset Relations
- Split Edges
- Edit Vendor (VDA IDs)

#### Map Information

This panel is still in development and will provide informations like number of nodes or edges in a future update of the
editor.

#### Add Background

Explanation coming soon!

#### Edit Background

Explanation coming soon!

#### Save Background

Explanation coming soon!

#### Delete Background

Explanation coming soon!

#### LOG-Controller Structure

Explanation coming soon!

#### Options

- **Intersecting Edges**: By setting this option the user can create now edges which would intersect.
  > **Warning:**
  > By activating this options the user can create scenarios, that are currently not handled by our traffic manager
  > without creating reservation dependencies for the corresponding nodes.
- **Grid**: Here the user can activate the (snap to) grid as well as adjusting the size of the grid. While the grid is
  activated all nodes created will snap automatically to one of the positions defined by the grid. The grid is always made
  out of square cells. The user can activate or deactivate the grid at any time of the session. It does not affect any of
  the nodes already created.
  > **Note:**
  > Currently there is no option to make the grid visible.
- **General**: The user can place his name in the user field. The name of the user is added to the file if the map is saved to a
  JSON-file.

## Map Converter

Explanation coming soon!

#### SIEMENS Converter

Explanation coming soon!

#### Götting Map

Explanation coming soon!

#### MLR Map

Explanation coming soon!

## FAQ

Coming soon!

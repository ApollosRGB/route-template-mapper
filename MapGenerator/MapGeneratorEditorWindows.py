# -*- coding: utf-8 -*-
"""
Created on Tue Oct  8 16:39:06 2019

@author: DanielKampen
"""

import FreeSimpleGUI as sg
import enum
import MapGeneratorConverter
import MapGeneratorEditor
import Periphery
import MapComponents
import IdManagement
from Periphery import StationAutomaticSelectionMode
from MapGenerator import Node
from matplotlib.ticker import NullFormatter


def isConvertibleToFloat(value):
    try:
        float(value)
        return True
    except:
        return False


def enumToList(enumData):
    enumList = [el.name for el in enumData]
    return enumList


class WindowHandler:

    def __init__(self, editor=None):
        self.editor = editor
        self.popUp = False
        self.popUpValues = None

    def addEditor(self, editor):
        self.editor = editor

    def createPopUpWindow(self, popUpClass, eventInfo, *args, **kwargs):
        if self.popUp:
            self.popUp.forceClosing()
            self.terminatePopUpWindow(returnValues=False)
        if self.popUpValues:
            self.popUpValues = []
        self.editor.deactivateEditor()
        self.popUp = popUpClass(self, eventInfo, *args, **kwargs)
        if self.popUp:
            return True
        else:
            return False

    def terminatePopUpWindow(self, returnValues, returningValues=None):
        self.popUp = False
        if returnValues:
            self.popUpValues = returningValues
        self.editor.activateEditor()

    def getPopUpValues(self):
        return self.popUpValues
    
    @staticmethod
    def getPopUp(msg): #DON'T DELETE!
        sg.Popup(msg)
        
    @staticmethod
    def wrongFilePopUp(): #DON'T DELETE!
        sg.Popup('Map file does not fit to Vendor file schema!')

    @staticmethod
    def createSimpleGatePopup(): #ToDo: Delete gate mode!
        layout = [[sg.Text('Please define the Gate!')],
                  [sg.Text('ID'), sg.Input(size=(10, 1))],
                  [sg.OK(), sg.Cancel()]]

        window = sg.Window('Create Gate', layout, icon='icons/MapEditor.ico')

        event, values = window.Read()

        if event == 'OK':
            window.Close()
            return values[0]
        elif event == 'Cancel':
            window.Close()
            return None


class PopUpWindow:
    def __init__(self, windowHandler, eventInfo):
        self.windowHandler = windowHandler
        self.eventInfo = eventInfo
        self.windowName = str()
        self.windowSize = (None, None)
        self.icon = 'icons/MapEditor.ico'
        self.layout = False
        self.window = None
        self.event = list()
        self.values = list()
        self.returnValues = False
        self.returningValues = list()

    def createLayout(self):
        return [[]]

    def createWindow(self):
        return sg.Window(title=self.windowName, layout=self.layout, size=self.windowSize, icon=self.icon, keep_on_top=True)

    def forceClosing(self):
        self.window.Close()

    def mainloop(self):
        self.layout = self.createLayout()
        self.window = self.createWindow()
        self.event, self.values = self.window.Read()
        self.returningValues = self.eventHandling()
        self.terminatePopUp()

    def eventHandling(self):
        pass

    def terminatePopUp(self):
        self.windowHandler.terminatePopUpWindow(returnValues=self.returnValues, returningValues=self.returningValues)


class InfoPopUp(PopUpWindow):
    def __init__(self, windowHandler, eventInfo, message):
        super().__init__(windowHandler=windowHandler, eventInfo=eventInfo)
        self.windowName = 'Information!'
        self.message = message
        self.returnValues = False
        self.mainloop()

    def createLayout(self):
        layout = [[sg.Text(self.message)],
                  [sg.OK()]]
        return layout

    def eventHandling(self):
        if self.event in (None, 'OK', 'Exit', 'Cancel'):
            self.window.Close()
            return


class SavePopUp(PopUpWindow):
    def __init__(self, windowHandler, eventInfo):
        super().__init__(windowHandler=windowHandler, eventInfo=eventInfo)
        self.windowName = 'Choose filename'
        self.returnValues = True
        self.mainloop()

    def createLayout(self):
        layout = [[sg.Text('Filename')],
                  [sg.Input(), sg.FileSaveAs()],
                  [sg.OK(), sg.Cancel(), sg.Checkbox(text='Parking Spots as Booleans')]]
        return layout

    def eventHandling(self):
        if self.event == 'OK' and self.values[0]:
            self.window.Close()
            return self.values[0], self.values[1]
        elif self.event in (None, 'OK', 'Exit', 'Cancel'):
            self.window.Close()
            return None, False


class SaveLogStructurePopUp(PopUpWindow):
    def __init__(self, windowHandler, eventInfo):
        super().__init__(windowHandler=windowHandler, eventInfo=eventInfo)
        self.windowName = 'Choose filename'
        self.returnValues = True
        self.mainloop()

    def createLayout(self):
        layout = [[sg.Text('Filename')],
                  [sg.Input(), sg.FileSaveAs()],
                  [sg.OK(), sg.Cancel()]]
        return layout

    def eventHandling(self):
        if self.event == 'OK' and self.values[0]:
            self.window.Close()
            return self.values[0]
        elif self.event in (None, 'OK', 'Exit', 'Cancel'):
            self.window.Close()
            return None, False


class LoadPopUp(PopUpWindow):
    def __init__(self, windowHandler, eventInfo):
        super().__init__(windowHandler=windowHandler, eventInfo=eventInfo)
        self.windowName = 'Choose file to open'
        self.returnValues = True
        self.mainloop()

    def createLayout(self):
        layout = [[sg.Text('Filename')],
                  [sg.Input(), sg.FileBrowse()],
                  [sg.CloseButton('Open'), sg.Cancel()]]
        return layout

    def eventHandling(self):
        if self.event == 'Open':
            self.window.Close()
            return self.values[0]
        elif self.event == 'Cancel':
            self.window.Close()
            return None


class OptionsPopup(PopUpWindow):
    def __init__(self, windowHandler, eventInfo, edgeIntersecting, neighborhoodEditing, gridSnapping, gridSize, user):
        super().__init__(windowHandler=windowHandler, eventInfo=eventInfo)
        self.windowName = 'General Options'
        self.returnValues = True
        self.edgeIntersecting = edgeIntersecting
        self.neighborhoodEditing = neighborhoodEditing
        self.gridSnapping = gridSnapping
        self.gridSize = gridSize
        self.user = user
        self.mainloop()

    def createLayout(self):
        if self.gridSize is None:
            gridSizeInput = str()
        else:
            gridSizeInput = self.gridSize
        layout = [[sg.Text('Editing Options:')],
                  [sg.Checkbox('Allow intersecting edges', key='edgeIntersecting', default=self.edgeIntersecting)],
                  [sg.Checkbox('Edit dependencies in neighborhood', key='neighborhoodEditing', default=self.neighborhoodEditing)],
                  [sg.Text('')],
                  [sg.Text('Grid Options:')],
                  [sg.Checkbox('Snap to grid', key='gridSnapping', default=self.gridSnapping)],
                  [sg.Text('Grid Size (in meters):'), sg.Input(gridSizeInput, key='gridSize', size=(10, 1))],
                  [sg.Text('')],
                  [sg.Text('View Options:')],
                  [sg.Checkbox('Show reference coordinate system', key='showCoordinateSystem',
                               default=self.windowHandler.editor._showLocalCoordinateSystem)],
                  [sg.Checkbox('Work in local coordinate system', key='showInLocalCoordinates',
                               default=self.windowHandler.editor._showGraphInLocalCoordinateSystem)],
                  [sg.Checkbox('Show trajectory of selected edge', key='showTrajectory',
                               default=self.windowHandler.editor._showTrajectories)],
                  [sg.Text('')],
                  [sg.Text('General Options:')],
                  [sg.Text('User:'), sg.Input(self.user, key='user', size=(25, 1))],
                  [sg.Text('')],
                  [sg.OK(size=(10, 1))]]
        return layout

    def eventHandling(self):
        if self.event == 'OK':
            self.window.Close()
            return self.values
        elif self.event in (None, 'OK', 'Exit', 'Cancel'):
            self.window.Close()
            return None


class OpenBackgroundPopUp(PopUpWindow):
    def __init__(self, windowHandler, eventInfo, pixelToMeters):
        super().__init__(windowHandler=windowHandler, eventInfo=eventInfo)
        self.windowName = 'Choose file to open'
        self.returnValues = True
        self.pixelToMeters = pixelToMeters
        self.mainloop()

    def createLayout(self):
        layout = [[sg.Text('Choose Background File')],
                  [sg.Input(), sg.FileBrowse()],
                  [sg.Text('Meters per Pixel', size=(15, 1)), sg.Input(default_text=self.pixelToMeters, size=(10, 1))],
                  [sg.CloseButton('Open'), sg.Cancel()]]
        return layout

    def eventHandling(self):
        if self.event == 'Open':
            self.window.Close()
            return self.values[0], self.values[1]
        elif self.event in (None, 'OK', 'Exit', 'Cancel'):
            self.window.Close()
            return None, self.values[1]


class NodePopUp(PopUpWindow):
    def __init__(self, windowHandler, eventInfo, node, inLocalCoordinates=False):
        super().__init__(windowHandler=windowHandler, eventInfo=eventInfo)
        self.windowName = 'Node Information'
        self.returnValues = True
        self.node = node
        self.nodeType = self.getNodeTypes()
        self.inLocalCoordinates = inLocalCoordinates
        self.mainloop()

    def createLayout(self):
        layout = [[sg.Text('ID:', size=(10, 1)), sg.Input(str(self.node['id']), size=(10, 1))],
                  [sg.Text('X:', size=(10, 1)), sg.Input(self.node['x' if self.inLocalCoordinates else 'mapX'], size=(10, 1))],
                  [sg.Text('Y:', size=(10, 1)), sg.Input(self.node['y' if self.inLocalCoordinates else 'mapY'], size=(10, 1))],
                  [sg.Text('Node Type:', size=(10, 1)), sg.Button('Edit', size=(8, 1))],
                  [sg.Text(' ')],
                  [sg.OK(size=(8, 1)), sg.Cancel(size=(8, 1))]]

        return layout

    def eventHandling(self):
        if self.event == 'OK':
            self.window.Close()
            return self.values
        if self.event == 'Edit':
            self.window.Close()
            _EditNodeTypePopUp(self.windowHandler, self.eventInfo, self.node)
        if self.event == 'Cancel':
            self.window.Close()
            return None

    def getNodeTypes(self):
        nodeTypes = []
        if 'entryLocation' in self.node:
            nodeTypes.append('entryLocation ' + str(self.node['entryLocation']['id']))
        if 'gate' in self.node:
            nodeTypes.append('gate ' + str(self.node['gate']['id']))
        if 'emergencySpot' in self.node:
            nodeTypes.append('emergencySpot')
        if 'chargingStation' in self.node:
            nodeTypes.append('chargingStation')
        if not nodeTypes:
            nodeTypes = None
        return nodeTypes


class _EditNodeTypePopUp(PopUpWindow):
    def __init__(self, windowHandler, eventInfo, node):
        super().__init__(windowHandler=windowHandler, eventInfo=eventInfo)
        self.windowName = 'Edit Node Type'
        self.windowSize = (250, 190)
        self.returnValues = True
        self.node = node
        self.treeData = self.updateNodeTypeTree()
        self.mainloop()

    def createLayout(self):
        layout = [[sg.Tree(data=self.treeData, headings=['Id'], auto_size_columns=False, num_rows=6, col0_width=25,
                           visible_column_map=[False], enable_events=True, key='tree')],
                  [sg.Button('Add', size=(10, 1)), sg.Button('Delete', size=(10, 1))]]
        return layout

    def eventHandling(self):
        while True:  # Event Loop
            self.event, values = self.window.Read()
            if self.event == 'Delete':
                selected_row = self.window.Element('tree').SelectedRows[0]
                if self.window.Element('tree').TreeData.tree_dict[selected_row].parent:
                    self.windowHandler.editor.activeGraph.deleteNodeType(self.node, self.window.Element('tree').TreeData.tree_dict[selected_row].parent)
                    treeData = self.updateNodeTypeTree()
                    self.window.Element('tree').Update(values=treeData)
            if self.event == 'Add':
                if self.window.Element('tree').SelectedRows:
                    typePopUp = _DefineNodeTypePopUp(defaultType=self.window.Element('tree').SelectedRows[0])
                else:
                    typePopUp = _DefineNodeTypePopUp()
                typePopUpValues = typePopUp.getReturnValues()
                nodeType = typePopUpValues[0]
                allowedLoad = typePopUpValues[1]
                typeId = typePopUpValues[2]
                if nodeType is not None:
                    temp_node_comp = { str(nodeType): True }
                    if allowedLoad != '':   # it can be (ooptionally) configured of loaded AGVs are allowed
                        temp_node_comp[str(nodeType)] = { 'allowLoadedAgvs': allowedLoad }
                    self.windowHandler.editor.activeGraph.addNodeType(node=self.node, nodeType=nodeType, nodeTypeInfo=temp_node_comp[str(nodeType)])
                    self.window.Element('tree').Update(values=self.updateNodeTypeTree())
            if self.event in (None, 'OK', 'Exit', 'Cancel'):
                break
        self.window.Close()

    def updateNodeTypeTree(self):
        treeData = sg.TreeData()
        treeData.Insert(parent='', key='emergencySpot', text='emergencySpot', values=[])
        treeData.Insert(parent='', key='parkingSpot', text='parkingSpot', values=[])
        if 'emergencySpot' in self.node:
            treeData.Insert(parent='emergencySpot', key='actualemergencySpot',
                            text=str(self.node['emergencySpot']), values=[str(self.node['emergencySpot'])])
        if 'parkingSpot' in self.node:
            treeData.Insert(parent='parkingSpot', key='actualparkingSpot',
                            text=str(self.node['parkingSpot']), values=[str(self.node['parkingSpot'])])
        return treeData


class _DefineNodeTypePopUp:
    def __init__(self, defaultType='emergencySpot'):
        self.windowName = 'Define Node Type'
        self.windowSize = (None, None)
        self.icon = 'icons/MapEditor.ico'
        self.layout = False
        self.window = None
        self.event = list()
        self.values = list()
        self.returningValues = list()
        self.defaultType = defaultType
        self.mainloop()

    def createLayout(self):
        layout = [[sg.Text('Please define the Type!')],
                  [sg.Combo(['emergencySpot', 'parkingSpot'], default_value=self.defaultType)],
                  [sg.Text('Allowed Load'), sg.Combo([True, False], default_value=None)],
                  [sg.Text('Type ID'), sg.Input(size=(10, 1))],
                  [sg.OK(), sg.Cancel()]]
        return layout

    def createWindow(self):
        return sg.Window(title=self.windowName, layout=self.layout, size=self.windowSize, icon=self.icon, keep_on_top=True)

    def mainloop(self):
        self.layout = self.createLayout()
        self.window = self.createWindow()
        self.event, self.values = self.window.Read()
        self.returningValues = self.eventHandling()
        self.window.close()

    def eventHandling(self):
        if self.event == 'OK':
            self.window.Close()
            return self.values
        elif self.event in [None, 'Cancel', 'Exit']:
            self.window.Close()
            return [None, None, None]

    def getReturnValues(self):
        return self.returningValues


class EdgePopUp(PopUpWindow):
    def __init__(self, windowHandler, eventInfo, edge):
        super().__init__(windowHandler=windowHandler, eventInfo=eventInfo)
        self.windowName = 'Edge Information'
        self.returnValues = True
        self.edge = edge
        self.mainloop()

    def createLayout(self):
        layout = [[sg.Text('ID:', size=(10, 1)), sg.Input(str(self.edge['id']), size=(10, 1))],
                  [sg.Text('Start Node:', size=(10, 1)), sg.Text(self.edge['startNodeId'], size=(10, 1))],
                  [sg.Text('End Node:', size=(10, 1)), sg.Text(self.edge['endNodeId'], size=(10, 1))],
                  [sg.Text(' ')],
                  [sg.OK(size=(8, 1)), sg.Cancel(size=(8, 1))]]
        return layout

    def eventHandling(self):
        if self.event == 'OK':
            self.window.Close()
            return self.values[0]
        if self.event == 'Cancel':
            self.window.Close()
            return None


class HandlingStationPopUp(PopUpWindow):
    def __init__(self, windowHandler, eventInfo, station):
        super().__init__(windowHandler=windowHandler, eventInfo=eventInfo)
        self.windowName = 'Handling Station Information'
        self.returnValues = True
        self.station = station
        self.mainloop()

    def createLayout(self):
        x, y = self.station.getPosition()
        layout = [[sg.Text('ID:', size=(10, 1)), sg.Input(str(self.station.getId()), key='id', size=(10, 1))],
                  [sg.Text('X:', size=(10, 1)), sg.Input(str(x), key='x', size=(10, 1))],
                  [sg.Text('Y:', size=(10, 1)), sg.Input(str(y), key='y', size=(10, 1))],
                  [sg.Text(' ')],
                  [sg.OK(size=(8, 1)), sg.Cancel(size=(8, 1))]]
        return layout

    def eventHandling(self):
        if self.event == 'OK':
            self.window.Close()
            return self.values
        if self.event == 'Cancel':
            self.window.Close()
            return None


class GroupEditingPopUp(PopUpWindow):
    def __init__(self, windowHandler, eventInfo, stations, groups):
        super().__init__(windowHandler=windowHandler, eventInfo=eventInfo)
        self.windowName = 'Edit Handling Station Groups'
        self.returnValues = False
        self.stations = stations
        self.groups = groups
        self.stationIds = list()
        for station in self.stations:
            if not station.checkStationInGroup(self.groups):
                self.stationIds.append(station.getId())

        self.groupIds = [group.getId() for group in groups]
        #self.groupStations = dict()
        #for group in groups:
        #    self.groupStations[group.getId()] = [station.getId() for station in group.getStations()]
        self.selectedGroup = None
        self.selectedGroupStations = list()
        self.availableStations = list()
        self.selectedAssignedStation = None
        self.selectedAvailableStation = None
        self.newGroupCounter = 0

        self.keyRemoveStation = 'removeStation'
        self.keyAddStation = 'addStation'
        self.keyAddGroup = 'addGroup'
        self.keyDeleteGroup = 'deleteGroup'
        self.keyListboxGroups = 'listboxGroups'
        self.keyListboxAvailableStations = 'listboxAvailableStations'
        self.keyListboxAssignedStations = 'listboxAssignedStations'
        self.keyGroupIdInput = 'groupIdInput'
        self.keyGroupControlledId = 'groupControlledId'
        self.keyGroupJustInSequencedId = 'keyGroupJustInSequencedId'
        self.keyGroupStationAutomaticSelectionModeId = 'keyGroupStationAutomaticSelectionModeId'
        self.keyChangeId = 'ChangeId'
        self.keyInfoText = 'infoText'

        self.mainloop()

    def createLayout(self):
        leftColRow1 = [
            [sg.T('Groups', size=(14, 1))],
            [sg.Listbox(self.groupIds, size=(18, 8), key=self.keyListboxGroups, enable_events=True),
             sg.T(str(), size=(6, 1), pad=(0, 0))],
            [sg.Button('Add', size=(8, 1), key=self.keyAddGroup),
             sg.Button('Delete', size=(8, 1), key=self.keyDeleteGroup)]
        ]
        leftColRow2 = [
            [sg.T('Available Stations', size=(14, 1))],
            [sg.Listbox(self.stationIds, size=(18, 8), key=self.keyListboxAvailableStations, enable_events=True),
             sg.Button('<', key=self.keyRemoveStation, size=(6, 1), pad=(0, 0))]
        ]
        rightColRow1 = [
            [sg.T('Group Info', size=(14, 1))],
            [sg.Input(size=(14, 1), key=self.keyGroupIdInput), sg.Button('Change', size=(8, 1), key=self.keyChangeId)],
            [sg.T('ID already exist!', key=self.keyInfoText, text_color='red', visible=False)],
            [sg.Checkbox('Controlled', key=self.keyGroupControlledId, enable_events=True)],
            [sg.Checkbox('JustInSequence', key=self.keyGroupJustInSequencedId, enable_events=True)],
            [sg.Combo([e.name for e in StationAutomaticSelectionMode], default_value=None, key=self.keyGroupStationAutomaticSelectionModeId, enable_events=True)]
        ]
        rightColRow2 = [
            [sg.T(str(), size=(6, 1), pad=(0, 0)), sg.T('Assigned Stations', size=(14, 1))],
            [sg.Button('>', key=self.keyAddStation, size=(6, 1), pad=(0, 0)),
             sg.Listbox(self.selectedGroupStations, size=(18, 8), key=self.keyListboxAssignedStations,
                        enable_events=True)]
        ]

        layout = [[sg.Col(leftColRow1), sg.Col(rightColRow1)],
                   [sg.Col(leftColRow2), sg.Col(rightColRow2)],
                   [sg.T(str())],
                   [sg.OK(size=(8, 1))]]
        return layout

    def mainloop(self):
        self.layout = self.createLayout()
        self.window = self.createWindow()
        while True:  # Event Loop
            self.event, self.values = self.window.Read()
            if self.event in (None, 'OK', 'Exit', 'Cancel'):
                self.window.Close()
                break
            self.eventHandling()
        self.terminatePopUp()

    def eventHandling(self):
        #get information about selected objects
        if self.values[self.keyListboxGroups]:
            for group in self.groups:
                if group.getId() == self.values[self.keyListboxGroups][0]:
                    self.selectedGroup = group
                    break
        if self.values[self.keyListboxAvailableStations]:
            for station in self.stations:
                if station.getId() == self.values[self.keyListboxAvailableStations][0]:
                    self.selectedAvailableStation = station
                    break
        if self.values[self.keyListboxAssignedStations]:
            for station in self.stations:
                if station.getId() == self.values[self.keyListboxAssignedStations][0]:
                    self.selectedAssignedStation = station
                    break

        #event handling
        self.window.find_element(self.keyInfoText).Update(visible=False)
        if self.event == self.keyAddGroup:
            newGroupId = 'newGroup' + str(self.newGroupCounter)
            self.groups.append(Periphery.HandlingStationGroup(newGroupId))
            self.newGroupCounter += 1
        elif self.event == self.keyDeleteGroup:
            if self.selectedGroup is not None:
                self.groups.remove(self.selectedGroup)
                self.selectedGroup = None
        elif self.event == self.keyAddStation:
            if (self.selectedAvailableStation is not None) and (self.selectedGroup is not None):
                self.selectedGroup.addStation(self.selectedAvailableStation)
        elif self.event == self.keyRemoveStation:
            if self.selectedAssignedStation is not None:
                self.selectedGroup.removeStation(self.selectedAssignedStation)
        elif self.event == self.keyChangeId:
            if self.selectedGroup is not None:
                if str(self.values[self.keyGroupIdInput]) not in self.groupIds:
                    self.selectedGroup.setId(str(self.values[self.keyGroupIdInput]))
                else:
                    self.window.find_element(self.keyInfoText).Update(visible=True)
        elif self.event == self.keyGroupControlledId:
            if self.selectedGroup is not None:
                self.selectedGroup._controlled=self.window.find_element(self.keyGroupControlledId).get()
        elif self.event == self.keyGroupJustInSequencedId:
            if self.selectedGroup is not None:
                self.selectedGroup._justInSequence=self.window.find_element(self.keyGroupJustInSequencedId).get()
        elif self.event == self.keyGroupStationAutomaticSelectionModeId:
            if self.selectedGroup is not None:
                self.selectedGroup._stationAutomaticSelectionMode=StationAutomaticSelectionMode[self.window.find_element(self.keyGroupStationAutomaticSelectionModeId).get()]

        #update elements
        self.stationIds = list()
        for station in self.stations:
            if not station.checkStationInGroup(self.groups):
                self.stationIds.append(station.getId())
        self.groupIds = [group.getId() for group in self.groups]
        if self.selectedGroup is not None:
            self.selectedGroupStations = [station.getId() for station in self.selectedGroup.getStations()]
            self.window.find_element(self.keyGroupIdInput).Update(value=self.selectedGroup.getId())
            self.window.find_element(self.keyListboxAvailableStations).Update(values=self.stationIds)
            self.window.find_element(self.keyGroupControlledId).Update(value=self.selectedGroup._controlled)
            self.window.find_element(self.keyGroupJustInSequencedId).Update(value=self.selectedGroup._justInSequence)
            self.window.find_element(self.keyGroupStationAutomaticSelectionModeId).Update(value=self.selectedGroup._stationAutomaticSelectionMode.name)
        else:
            self.window.find_element(self.keyGroupIdInput).Update(value=str())

        if self.selectedGroupStations and self.selectedAssignedStation in self.selectedGroupStations:
            self.window.find_element(self.keyListboxAssignedStations).Update(values=self.selectedGroupStations)
                                                                            #set_to_index=self.selectedGroupStations.index(self.selectedAssignedStation.getId()))
        else:
            self.window.find_element(self.keyListboxAssignedStations).Update(values=self.selectedGroupStations)
        if self.groupIds and self.selectedGroup is not None:
            self.window.find_element(self.keyListboxGroups).Update(values=self.groupIds,
                                                                  set_to_index=self.groupIds.index(self.selectedGroup.getId()))
        else:
            self.window.find_element(self.keyListboxGroups).Update(values=self.groupIds)


class TrafficLightPopUp(PopUpWindow):
    def __init__(self, windowHandler, eventInfo, light):
        super().__init__(windowHandler=windowHandler, eventInfo=eventInfo)
        self.windowName = 'Traffic Light Information'
        self.returnValues = True
        self.trafficLight = light
        self.mainloop()

    def createLayout(self):
        x, y = self.trafficLight.getPosition()
        layout = [[sg.Text('ID:', size=(10, 1)), sg.Input(str(self.trafficLight.getId()), key='id', size=(10, 1))],
                  [sg.Text('X:', size=(10, 1)), sg.Input(str(x), key='x', size=(10, 1))],
                  [sg.Text('Y:', size=(10, 1)), sg.Input(str(y), key='y', size=(10, 1))],
                  [sg.Text(' ')],
                  [sg.OK(size=(8, 1)), sg.Cancel(size=(8, 1))]]
        return layout

    def eventHandling(self):
        if self.event == 'OK':
            self.window.Close()
            return self.values
        if self.event == 'Cancel':
            self.window.Close()
            return None


class ChargingStationPopUp(PopUpWindow):
    def __init__(self, windowHandler, eventInfo, station):
        super().__init__(windowHandler=windowHandler, eventInfo=eventInfo)
        self.windowName = 'Charging Station Information'
        self.returnValues = True
        self.station = station
        self.mainloop()

    def createLayout(self):
        x, y = self.station.getPosition()
        layout = [[sg.Text('ID:', size=(10, 1)), sg.Input(str(self.station.getId()), key='id', size=(10, 1))],
                  [sg.Text('X:', size=(10, 1)), sg.Input(str(x), key='x', size=(10, 1))],
                  [sg.Text('Y:', size=(10, 1)), sg.Input(str(y), key='y', size=(10, 1))],
                  [sg.Text(' ')],
                  [sg.OK(size=(8, 1)), sg.Cancel(size=(8, 1))]]
        return layout

    def eventHandling(self):
        if self.event == 'OK':
            self.window.Close()
            return self.values
        if self.event == 'Cancel':
            self.window.Close()
            return None


class SelectFolderPopUp(PopUpWindow):
    def __init__(self, windowHandler, eventInfo):
        super().__init__(windowHandler=windowHandler, eventInfo=eventInfo)
        self.windowName = 'Choose Folder'
        self.returnValues = True
        self.mainloop()

    def createLayout(self):
        layout = [[sg.Text('Project')],
                  [sg.Text('Path', size=(6, 1)), sg.Input(key='path'), sg.FolderBrowse()],
                  [sg.Text('Name', size=(6, 1)), sg.Input(key='name')],
                  [sg.OK(), sg.Cancel()]]
        return layout

    def eventHandling(self):
        if self.event == 'OK':
            self.window.Close()
            return self.values['path'], self.values['name']
        elif self.event in (None, 'Exit', 'Cancel'):
            self.window.Close()
            return None, None


class ImportExternalMapPopUp(PopUpWindow):
    def __init__(self, windowHandler, eventInfo):
        super().__init__(windowHandler=windowHandler, eventInfo=eventInfo)
        self.windowName = 'Choose map to import'
        self.returnValues = True
        self.mainloop()

    def createLayout(self):
        layout = [[sg.Text('Choose external map File')],
                  [sg.Input(), sg.FileBrowse()],
                  [sg.Text('Map Provider', size=(10, 1)), sg.Combo(values=enumToList(MapGeneratorConverter.Vendor),
                                                                   default_value=enumToList(
                                                                       MapGeneratorConverter.Vendor)[0],
                                                                   size=(14, 1)),
                   sg.Checkbox(text='Create NURBS file')],
                  [sg.CloseButton('Open'), sg.Cancel()]]
        return layout

    def eventHandling(self):
        if self.event == 'Open':
            self.window.Close()
            return self.values[0], MapGeneratorConverter.Vendor[self.values[1]], self.values[2]
        elif self.event in (None, 'OK', 'Exit', 'Cancel'):
            self.window.Close()
            return None, None, False


class SetBackPopUp(PopUpWindow):
    def __init__(self, windowHandler, eventInfo):
        super().__init__(windowHandler=windowHandler, eventInfo=eventInfo)
        self.windowName = 'Delete current Map'
        self.returnValues = True
        self.mainloop()

    def createLayout(self):
        layout = [[sg.Text('Do you want to delete the hole map?')],
                  [sg.Yes(size=(8, 1)), sg.No(size=(8, 1))]]
        return layout

    def eventHandling(self):
        if self.event == 'Yes':
            self.window.Close()
            return self.event
        elif self.event == 'No':
            self.window.Close()
            return self.event


class CreateNodePopUp(PopUpWindow):
    def __init__(self, windowHandler, eventInfo):
        super().__init__(windowHandler=windowHandler, eventInfo=eventInfo)
        self.windowName = 'Create Node'
        self.returnValues = True
        self.mainloop()

    def createLayout(self):
        layout = [[sg.Text('Node ID', size=(11, 1)), sg.Input(size=(9, 1), key='id')],
                  [sg.Text('X-Coordinate', size=(11, 1)), sg.Input(size=(9, 1), key='x')],
                  [sg.Text('Y-Coordinate', size=(11, 1)), sg.Input(size=(9, 1), key='y')],
                  [sg.Text('')],
                  [sg.OK(size=(8, 1)), sg.Cancel(size=(8, 1))]]
        return layout

    def eventHandling(self):
        if self.event == 'OK':
            self.window.Close()
            if not self.values['id']:
                self.values['id'] = None
            if isConvertibleToFloat(self.values['x']) and isConvertibleToFloat(self.values['y']):
                self.values['x'] = float(self.values['x'])
                self.values['y'] = float(self.values['y'])
            else:
                self.values['x'] = self.values['y'] = self.values['id'] = None
            return self.values['id'], self.values['x'], self.values['y']
        elif self.event in (None, 'Exit', 'Cancel'):
            self.window.Close()
            return None, None, None


class ScalePopUp(PopUpWindow):
    def __init__(self, windowHandler, eventInfo):
        super().__init__(windowHandler=windowHandler, eventInfo=eventInfo)
        self.windowName = 'Rescale Map'
        self.returnValues = True
        self.mainloop()

    def createLayout(self):
        layout = [[sg.Text('Please define the map scaling!')],
                  [sg.Text('Unit'), sg.Combo(['meter', 'millimeter'], key='unit', default_value='meter')],
                  [sg.Text('Original Length'), sg.Input(size=(10, 1), key='originalLength', default_text='1.0')],
                  [sg.Text('Target Length'), sg.Input(size=(10, 1), key='newLength', default_text='1.0')],
                  [sg.OK(), sg.Cancel()]]
        return layout

    def eventHandling(self):
        scale = 1.0
        unit = 'meter'
        if self.event == 'OK':
            if isConvertibleToFloat(self.values['newLength']) and isConvertibleToFloat(self.values['originalLength']):
                scale = float(self.values['newLength']) / float(self.values['originalLength'])
                unit = self.values['unit']
        self.window.Close()
        return unit, scale


class NodeTablePopUp(PopUpWindow):
    def __init__(self, windowHandler, eventInfo, nodes, inLocal=False):
        super().__init__(windowHandler=windowHandler, eventInfo=eventInfo)
        self.windowName = 'Node Info'
        self.returnValues = False
        self.nodes = nodes
        self.inLocal = inLocal
        self.mainloop()

    def createLayout(self):
        headers = ['Row', 'Node ID', 'x', 'y', 'Node Types']
        widths = [10, 10, 10, 10, 10]
        data = []
        nodeTypes = []
        rowNumbers = []
        if self.nodes:
            rowNumbers = range(1, len(self.nodes)+1)
        for node in self.nodes:
            if 'emergencySpot' in node:
                nodeTypes.append('emergencySpot')
            if not nodeTypes:
                nodeTypes = None
            nodeData = [rowNumbers[self.nodes.index(node)], str(node['id']), str(node['x' if self.inLocal else 'mapX']),
                        str(node['y' if self.inLocal else 'mapY']), str(nodeTypes)]
            data.append(nodeData)
            nodeTypes = []
        if not data:
            data = ['' for col in range(5)]
        layout = [[sg.Table(values=data, headings=headers, col_widths=widths, background_color='lightblue',
                            auto_size_columns=False,
                            display_row_numbers=False,
                            justification='left',
                            key='-table-',
                            tooltip='This is a table')]]
        return layout

    def eventHandling(self):
        if self.event:
            self.window.Close()


class EditBackgroundPopUp(PopUpWindow):
    def __init__(self, windowHandler, eventInfo):
        super().__init__(windowHandler=windowHandler, eventInfo=eventInfo)
        self.windowName = 'Edit Background'
        self.returnValues = True
        self.mainloop()

    def createLayout(self):
        layout = [[sg.Text('Edit you current Background!')],
                  [sg.Text('Flip Background:')],
                  [sg.Button('Horizontal'), sg.Button('Vertical')],
                  [sg.Text('Move Background:')],
                  [sg.Text('Translation X'), sg.Input(size=(10, 1), key='translationX')],
                  [sg.Text('Translation Y'), sg.Input(size=(10, 1), key='translationY')],
                  [sg.OK(), sg.Cancel()]]
        return layout

    def eventHandling(self):
        flipEdit = str()
        transposeX = 0
        transposeY = 0
        if self.event == 'OK':
            self.window.Close()
            if not self.values['translationX'] or not isConvertibleToFloat(self.values['translationX']):
                self.values['translationX'] = 0
            if not self.values['translationY'] or not isConvertibleToFloat(self.values['translationY']):
                self.values['translationY'] = 0
            transposeX = float(self.values['translationX'])
            transposeY = float(self.values['translationY'])
        elif self.event == 'Horizontal':
            self.window.Close()
            flipEdit = 'horizontal'
        elif self.event == 'Vertical':
            self.window.Close()
            flipEdit = 'vertical'
        elif self.event == 'Cancel':
            self.window.Close()
        return flipEdit, transposeX, transposeY


class EditMapPopUp(PopUpWindow):
    def __init__(self, windowHandler, eventInfo, edgeLengthLimit):
        super().__init__(windowHandler=windowHandler, eventInfo=eventInfo)
        self.windowName = 'Edit Map'
        self.returnValues = True
        self.edgeLengthLimit = edgeLengthLimit
        self.mainloop()

    def createLayout(self):
        layout = [[sg.Text('General:')],
                  [sg.Text('Map Name:', size=(13, 1)), sg.Input(self.windowHandler.editor.activeMap.mapName,
                                                                size=(12, 1), key='inputMaxLength')],
                  [sg.Text('')],
                  [sg.Text('Geo Coordinates of Center:')],
                  [sg.Text('Longitude:', size=(13, 1)),
                   sg.Input(default_text=str(self.windowHandler.editor.activeMap.longitude), size=(12, 1), key='longitude')],
                  [sg.Text('Latitude:', size=(13, 1)),
                   sg.Input(default_text=str(self.windowHandler.editor.activeMap.latitude), size=(12, 1), key='latitude')],
                  [sg.Text('')],
                  [sg.OK(size=(10, 1))]]

        return layout

    def eventHandling(self):
        if self.event == 'OK':
            self.window.Close()
            return self.values
        elif self.event in (None, 'Exit', 'Cancel'):
            self.window.Close()
            return None


class EditAgvTypesGraphPopUp(PopUpWindow):
    def __init__(self, windowHandler, eventInfo, agvTypes):
        super().__init__(windowHandler=windowHandler, eventInfo=eventInfo)
        self.windowName = 'Edit Map'
        self.returnValues = False
        self.agvTypes = agvTypes
        self.mainloop()

    def createLayout(self):
        headers = ['AGV Name', 'Vendor Name']
        widths = [20, 20]
        data = self.agvTypeListToData()
        layout = [[sg.Table(values=data, headings=headers, col_widths=widths,
                            enable_events=True, auto_size_columns=False, bind_return_key=True,
                            display_row_numbers=False,
                            justification='left', key='-table-', tooltip='This is a table')],
                  [sg.Button('Add', key='addAGV', size=(10, 1)), sg.Button('Remove', key='removeAGV', size=(10, 1))]]
        return layout

    def mainloop(self):
        self.layout = self.createLayout()
        self.window = self.createWindow()
        while True:  # Event Loop
            self.event, self.values = self.window.Read()
            if self.event in ['OK', 'Cancel', 'Exit', None]:
                self.window.Close()
                break
            self.eventHandling()
        self.terminatePopUp()

    def eventHandling(self):
        if self.event == 'addAGV':
            createdPopUp = _DefineAgvTypePopUp()
            if createdPopUp:
                newAgvTypeInfo = createdPopUp.getReturnValues()
                if newAgvTypeInfo[0] is not None and newAgvTypeInfo[1] is not None:
                    if not self.getAgvTypeByNameAndVendor(name=newAgvTypeInfo[0], vendor=newAgvTypeInfo[1]):
                        newAgvType = MapComponents.AGVType(name=newAgvTypeInfo[0], vendor=newAgvTypeInfo[1])
                        self.agvTypes.append(newAgvType)
                        self.window.find_element(key='-table-').Update(values=self.agvTypeListToData())
                        self.window.find_element(key='-table-').SetFocus(force=True)
                        table_row = self.window.find_element(key='-table-').Widget.get_children()[-1]
                        self.window.find_element(key='-table-').Widget.selection_set(table_row)  # move selection
                        self.window.find_element(key='-table-').Widget.focus(table_row)  # move focus
                        self.window.find_element(key='-table-').Widget.see(table_row)  # scroll to show it
                    else:
                        pass #already exist
        elif self.event == 'removeAGV':
            if self.values['-table-']:
                selectedAgvName = self.window.find_element(key='-table-').Values[self.values['-table-'][0]][0]
                selectedVendorName = self.window.find_element(key='-table-').Values[self.values['-table-'][0]][1]
                self.agvTypes.remove(self.getAgvTypeByNameAndVendor(name=selectedAgvName, vendor=selectedVendorName))
                self.window.find_element(key='-table-').Update(values=self.agvTypeListToData())
                self.window.find_element(key='-table-').SetFocus(force=True)
                table_row = self.window.find_element(key='-table-').Widget.get_children()[-1]
                self.window.find_element(key='-table-').Widget.selection_set(table_row)  # move selection
                self.window.find_element(key='-table-').Widget.focus(table_row)  # move focus
                self.window.find_element(key='-table-').Widget.see(table_row)  # scroll to show it

    def agvTypeListToData(self):
        data = list()
        for agvType in self.agvTypes:
            entry = [agvType.getName(), agvType.getVendor()]
            data.append(entry)
        if not data:
            data = ['' for col in range(2)]
        return data

    def getAgvTypeByNameAndVendor(self, name, vendor):
        for agvType in self.agvTypes:
            if agvType.getName() == name and agvType.getVendor() == vendor:
                return agvType
        return False


class _DefineAgvTypePopUp:
    def __init__(self):
        self.windowName = 'Define AGV Type'
        self.windowSize = (None, None)
        self.icon = 'icons/MapEditor.ico'
        self.layout = False
        self.window = None
        self.event = list()
        self.values = list()
        self.returningValues = list()
        self.mainloop()

    @staticmethod
    def createLayout():
        layout = [[sg.Text('Type Name'), sg.Input(size=(10, 1), key='nameInput')],
                  [sg.Text('Vendor Name'), sg.Input(size=(10, 1), key='vendorInput')],
                  [sg.OK(), sg.Cancel()]]
        return layout

    def createWindow(self):
        return sg.Window(title=self.windowName, layout=self.layout, size=self.windowSize, icon=self.icon, keep_on_top=True)

    def mainloop(self):
        self.layout = self.createLayout()
        self.window = self.createWindow()
        self.event, self.values = self.window.Read()
        self.returningValues = self.eventHandling()
        self.window.close()

    def eventHandling(self):
        if self.event == 'OK':
            return [self.values['nameInput'], self.values['vendorInput']]
        elif self.event in ['Cancel', 'Exit', None]:
            return [None, None]

    def getReturnValues(self):
        return self.returningValues


class GraphEditPopUp(PopUpWindow):
    def __init__(self, windowHandler, eventInfo, graphName, idOption):
        super().__init__(windowHandler=windowHandler, eventInfo=eventInfo)
        self.windowName = 'Edit Graph'
        self.returnValues = True
        self.graphName = graphName
        self.idOption = idOption
        self.mainloop()

    def createLayout(self):
        layout = [[sg.Text('General:')],
                  [sg.Text('Name of Graph:', size=(12, 1)), sg.Input(size=(20, 1), key='graphName', default_text=self.windowHandler.editor.activeGraph.getId())],
                  [sg.Text('ID Option:', size=(12, 1)),
                   sg.Combo(values=enumToList(IdManagement.IdOption),
                            default_value=self.idOption.name,
                            key='idOption',
                            size=(10, 1))],
                  [sg.Text('')],
                  [sg.Text('Transformation to Map Coordinate System:')],
                  [sg.Text('Translation X [m]:', size=(14, 1)),
                   sg.Input(size=(12, 1), key='translationX', default_text=self.windowHandler.editor.activeGraph.coordinateTransformation.translationX)],
                  [sg.Text('Translation Y [m]:', size=(14, 1)),
                   sg.Input(size=(12, 1), key='translationY', default_text=self.windowHandler.editor.activeGraph.coordinateTransformation.translationY)],
                  [sg.Text('Rotation Z [rad]:', size=(14, 1)),
                   sg.Input(size=(12, 1), key='rotationZ', default_text=self.windowHandler.editor.activeGraph.coordinateTransformation.rotationZ)],
                  [sg.Text('')],
                  [sg.Text('Edit Nodes:')],
                  [sg.Text('Dependencies:', size=(13, 1)),
                   sg.Button('Reset All', size=(10, 1), key='resetDependencies')],
                  [sg.Text('Assign new IDs', size=(13, 1)),
                   sg.Button('Assign', size=(10, 1), key='assignNewIds')],
                  [sg.Text('')],
                  [sg.Text('Edit Edges:')],
                  [sg.Text('Set Length Limit:', size=(13, 1)), sg.Input(self.windowHandler.editor.edgeLengthLimit,
                                                                        size=(12, 1), key='inputMaxLength'),
                   sg.Button('Split Edges', size=(10, 1), key='splitEdges')],
                  [sg.Text('')],
                  [sg.Text('Rescale Map:')],
                  [sg.Text('Original Length:', size=(13, 1)),
                   sg.Input(default_text=str(1.0), size=(12, 1), key='inputOriginalLength')],
                  [sg.Text('Target Length:', size=(13, 1)),
                   sg.Input(default_text=str(1.0), size=(12, 1), key='inputTargetLength'),
                   sg.Button('Rescale Graph', size=(10, 1), key='rescaleGraph', disabled=True)],
                  [sg.Text('')],
                  [sg.OK(size=(10, 1)), sg.Cancel(size=(10, 1))]]
        return layout

    def eventHandling(self):
        if self.event == 'OK':
            self.window.Close()
            return self.values
        elif self.event in (None, 'Exit', 'Cancel'):
            self.window.Close()
            return None
        elif self.event == 'resetDependencies':
            self.windowHandler.editor.activeMap.removeAllDependenciesFromNodes()
            sg.popup('All dependencies removed!', keep_on_top=True)
        elif self.event == 'assignNewIds':
            self.windowHandler.editor.activeGraph.assignNewIds()
            sg.popup('New IDs were set for all elements', keep_on_top=True)
        elif self.event == 'splitEdges':
            if isConvertibleToFloat(self.values['inputMaxLength']):
                self.windowHandler.editor.setEdgeLimit(float(self.values['inputMaxLength']))
                self.windowHandler.editor.activeGraph.splitEdges(self.windowHandler.editor.edgeLengthLimit)
                sg.popup('All edges are now limit confirm!', keep_on_top=True)
            else:
                sg.popup('Edge length limit is not a number!', keep_on_top=True)
        self.window.Close()


class ChangesInfoPopUp(PopUpWindow):
    def __init__(self, windowHandler, eventInfo, changes):
        super().__init__(windowHandler=windowHandler, eventInfo=eventInfo)
        self.windowName = 'Node Info'
        self.returnValues = False
        self.changes = changes
        self.mainloop()

    def createLayout(self):
        headers = ['Change No.', 'Description']
        widths = [10, 40]
        data = list()
        rowNumbers = list()
        if self.changes:
            rowNumbers = range(1, len(self.changes)+1)
            for change in self.changes:
                data.append([rowNumbers[self.changes.index(change)], str(change)])
        if not data:
            data = ['' for col in range(2)]
        layout = [[sg.Table(values=data, headings=headers, col_widths=widths, background_color='lightblue',
                            auto_size_columns=False,
                            display_row_numbers=False,
                            justification='left',
                            key='-table-',
                            tooltip='This is a table')]]
        return layout

    def eventHandling(self):
        if self.event:
            self.window.Close()

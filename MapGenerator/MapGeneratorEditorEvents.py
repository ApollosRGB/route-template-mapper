# -*- coding: utf-8 -*-
"""
Created on Mon Oct 21 14:18:36 2019

@author: DanielKampen
"""

import MapGeneratorEditorWindows as Windows
import MapGeneratorMedialAxis as MedialAxis
from MapGeneratorBackground import Background
from MapGeneratorMode import Mode
import MapGeneratorEditor
import MapGeneratorConverter
import LogFileImport
from MapGeneratorNURBS import NURBS
import HelperFunctions
import IdManagement
import MapComponents
import LOGEditor
import FreeSimpleGUI as sg
import math


def isConvertibleToFloat(value):
    try:
        float(value)
        return True
    except:
        return False


class EventHandler:

    def __init__(self, editor=None):
        self.editor: MapGeneratorEditor.MapGeneratorEditor
        self.editor = editor
        if self.editor is not None:
            self.windowHandler = self.editor.windowHandler
        else:
            self.windowHandler = None

    def addEditor(self, editor):
        self.editor = editor
        self.windowHandler = self.editor.windowHandler

    def leftButtonDrag(self, event, position, dx, dy):
        if not self.editor.activeGraph.isNode(self.editor._select) or self.editor._mode == Mode.dependencies:
            dxI = -dx * self.editor.pixelToTickRatio
            dyI = -dy * self.editor.pixelToTickRatio
            self.movingViewEvent(event, dxI, dyI)
            self.editor._moveX = position[0]
            self.editor._moveY = position[1]
            self.editor.drawCanvas()
        else:
            if not self.editor._lockNodes and self.editor._mode != Mode.edge:
                if self.editor._ghost is None:
                    if self.editor.activeGraph.isNode(self.editor._select) and self.editor.inRangeNode(self.editor._select, event.xdata, event.ydata):
                        self.editor._ghost = (event.xdata, event.ydata)
                        self.editor._ghostConnections = self.editor.activeGraph.getConnectedNodes(self.editor._select)
                        self.editor.drawCanvas()
                else:
                    if self.editor._gridSnapping:
                        x, y = self.editor.snapCoordinates(event.xdata, event.ydata)
                        self.editor._ghost = (x, y)
                    else:
                        self.editor._ghost = (event.xdata, event.ydata)
                    self.editor.drawCanvas()

    def rightButtonDrag(self, event):
        if self.editor._mode == Mode.dependencies:
            return
        if self.editor._select is None:
            return
        else:
            if self.editor._gridSnapping:
                x, y = self.editor.snapCoordinates(event.xdata, event.ydata)
                self.editor._ghost = (x, y)
            else:
                node = self.editor.closeObject(event.xdata, event.ydata)
                if node is not None:
                    if self.editor.activeGraph.isNode(node):
                        self.editor._ghost = (node['x' if self.editor._showGraphInLocalCoordinateSystem else 'mapX'], node['y' if self.editor._showGraphInLocalCoordinateSystem else 'mapY'])
                    else:
                        self.editor._ghost = (event.xdata, event.ydata)
                else:
                    self.editor._ghost = (event.xdata, event.ydata)
            self.editor._ghostConnections = [self.editor._select]
            self.editor.drawCanvas()

    def leftButtonDrop(self, event):
        if self.editor._mode != Mode.edge and self.editor._ghost is not None:
            self.editor.activeGraph.updateNodeCoordinates(self.editor._select,
                                                          self.editor._ghost[0] - self.editor._select['x' if self.editor._showGraphInLocalCoordinateSystem else 'mapX'],
                                                          self.editor._ghost[1] - self.editor._select['y' if self.editor._showGraphInLocalCoordinateSystem else 'mapY'],
                                                          inLocalCoordinates=self.editor._showGraphInLocalCoordinateSystem)
            self.editor.deselectObject()

    def rightButtonDrop(self, event):
        if self.editor._ghost is not None and self.editor._mode != Mode.dependencies:
            if self.editor.activeGraph.isNode(self.editor._select):
                x = self.editor._ghost[0]
                y = self.editor._ghost[1]
                node = self.editor.closeObject(x, y)
                if node is None:
                    node = self.editor.activeGraph.createNode(nodeX=x, nodeY=y, inLocalCoordinates=self.editor._showGraphInLocalCoordinateSystem)
                    edgesIntersect = self.editor.activeGraph.testEdgeIntersect(self.editor._select, node)
                    if self.editor.edgesCanIntersect and edgesIntersect or not edgesIntersect:
                        self.editor.activeGraph.createEdge(self.editor._select, node)
                    else:
                        self.editor.activeMap.deleteNode(node, self.editor.activeGraph)
                        self.editor.deselectObject()
                        self.windowHandler.createPopUpWindow(Windows.InfoPopUp, event,
                                                             message='New edge would intersect with other edge!')
                else:
                    if self.editor.activeGraph.isNode(node):
                        edgesIntersect = self.editor.activeGraph.testEdgeIntersect(self.editor._select, node)
                        if self.editor.edgesCanIntersect and edgesIntersect or not edgesIntersect:
                            if not self.editor.activeGraph.testEdgeExists(self.editor._select, node):
                                self.editor.activeGraph.createEdge(self.editor._select, node)
                            else:
                                self.editor.deselectObject()
                                self.windowHandler.createPopUpWindow(Windows.InfoPopUp, event,
                                                                     message='Edge does already exist!')
            self.editor.deselectObject()

    def moveEventEdgeMode(self, event):
        if event.inaxes:
            if self.editor._select is not None:
                if self.editor._gridSnapping:
                    x, y = self.editor.snapCoordinates(event.xdata, event.ydata)
                    self.editor._ghost = (x, y)
                else:
                    node = self.editor.closeObject(event.xdata, event.ydata)
                    if node is not None:
                        if self.editor.activeGraph.isNode(node):
                            self.editor._ghost = (node['x'], node['y'])
                        else:
                            self.editor._ghost = (event.xdata, event.ydata)
                    else:
                        self.editor._ghost = (event.xdata, event.ydata)
                self.editor._ghostConnections = [self.editor._select]
                self.editor.drawCanvas()
            else:
                self.editor._ghost = None
                self.editor._ghostConnections = []
                self.editor.drawCanvas()

    def infoPanelUpdateEvent(self, event):
        infoId = '-'
        infoX = str(event.xdata)
        infoY = str(event.ydata)
        infoLength = '-'
        if self.editor._ghost is not None:
            infoId = self.editor._select['id']
            infoX = self.editor._ghost[0]
            infoY = self.editor._ghost[1]
            if self.editor._ghostConnections:
                infoLength = math.sqrt((self.editor._ghostConnections[0]['x'] - self.editor._ghost[0])**2 +
                                       (self.editor._ghostConnections[0]['y'] - self.editor._ghost[1])**2)

        elif self.editor._select is not None:
            if self.editor.activeGraph.isNode(self.editor._select):
                infoX = self.editor._select['x' if self.editor._showGraphInLocalCoordinateSystem else 'mapX']
                infoY = self.editor._select['y' if self.editor._showGraphInLocalCoordinateSystem else 'mapY']
                infoId = self.editor._select['id']
            elif self.editor.activeMap.isStation(self.editor._select):
                pass
            elif self.editor.activeMap.isTrafficLight(self.editor._select):
                pass
            elif self.editor.activeMap.isChargingStation(self.editor._select):
                pass
            else:
                infoLength = self.editor.activeGraph.getEdgeLength(self.editor._select)
                infoX = '-'
                infoY = '-'
                infoId = self.editor._select['id']

        self.editor._mainWindow.infoPanelUpdate(infoId, infoX, infoY, infoLength)

    def infoEvent(self, event, selectedObject):
        if self.editor.activeGraph.isNode(selectedObject):
            self.nodeInfoEvent(event, selectedObject)
        elif self.editor.activeGraph.isEdge(selectedObject):
            self.edgeInfoEvent(event, selectedObject)
        elif self.editor.activeMap.isStation(selectedObject):
            self.stationInfoEvent(event, selectedObject)
        elif self.editor.activeMap.isTrafficLight(selectedObject):
            self.trafficLightInfoEvent(event, selectedObject)
        elif self.editor.activeMap.isChargingStation(selectedObject):
            self.chargingStationInfoEvent(event, selectedObject)

    def nodeInfoEvent(self, event, node=None):
        if node is None:
            node = self.editor.closeObject(event.xdata, event.ydata)
        if self.editor.activeGraph.isNode(node):
            self.editor._select = node
            self.editor.drawCanvas()
            popUpCreated = self.windowHandler.createPopUpWindow(Windows.NodePopUp, event, self.editor._select, self.editor._showGraphInLocalCoordinateSystem)
            if popUpCreated:
                values = self.windowHandler.getPopUpValues()
                if values is not None:
                    nodeId = values[0]
                    if isConvertibleToFloat(values[1]) and isConvertibleToFloat(values[2]):
                        x = float(values[1])
                        y = float(values[2])
                        if x != node['x' if self.editor._showGraphInLocalCoordinateSystem else 'mapX'] or y != node['y' if self.editor._showGraphInLocalCoordinateSystem else 'mapY']:
                            self.editor.activeGraph.updateNodeCoordinates(node, x - node['x' if self.editor._showGraphInLocalCoordinateSystem else 'mapX'], y - node['y' if self.editor._showGraphInLocalCoordinateSystem else 'mapY'], inLocalCoordinates=self.editor._showGraphInLocalCoordinateSystem)
                    else:
                        self.windowHandler.createPopUpWindow(Windows.InfoPopUp, event,
                                                             message='Given values are no numbers!')
                        return
                    if nodeId != node['id']:
                        changeNode = self.editor.activeGraph.updateNodeId(node, nodeId)
                        if not changeNode:
                            self.windowHandler.createPopUpWindow(Windows.InfoPopUp, event,
                                                                 message='Cannot change ID because Node ID already exist')
                else:
                    return
            else:
                return

    def edgeInfoEvent(self, event, edge=None):
        if edge is None:
            edge = self.editor.closeObject(event.xdata, event.ydata)
        if self.editor.activeGraph.isEdge(edge):
            self.editor._select = edge
            self.editor.drawCanvas()
            popUpCreated = self.windowHandler.createPopUpWindow(Windows.EdgePopUp, event, self.editor._select)
            if popUpCreated:
                edgeId = self.windowHandler.getPopUpValues()
                if edgeId is not None:
                    self.editor.activeGraph.updateEdgeId(edge, edgeId)

    def stationInfoEvent(self, event, station=None):
        if self.editor.activeMap.isStation(station):
            self.editor._select = station
            popUpCreated = self.windowHandler.createPopUpWindow(Windows.HandlingStationPopUp, event, self.editor._select)
            if popUpCreated:
                values = self.windowHandler.getPopUpValues()
                if values is not None:
                    stationId = values['id']
                    if isConvertibleToFloat(values['x']) and isConvertibleToFloat(values['y']):
                        x = float(values['x'])
                        y = float(values['y'])
                        self.editor._select.updatePosition(x, y)
                    else:
                        self.windowHandler.createPopUpWindow(Windows.InfoPopUp, event,
                                                             message='Given values are no numbers!')
                        return
                    if stationId != self.editor._select.getId():
                        changeStation = self.editor.activeMap.updateStationId(self.editor._select, stationId)
                        if not changeStation: #ToDo check for doubled station id
                            self.windowHandler.createPopUpWindow(Windows.InfoPopUp, event,
                                                                 message='Cannot change ID because station ID already exist')
            else:
                return

    def trafficLightInfoEvent(self, event, trafficLight=None):
        if self.editor.activeMap.isTrafficLight(trafficLight):
            self.editor._select = trafficLight
            popUpCreated = self.windowHandler.createPopUpWindow(Windows.TrafficLightPopUp, event, self.editor._select)
            if popUpCreated:
                values = self.windowHandler.getPopUpValues()
                if values is not None:
                    lightId = values['id']
                    if isConvertibleToFloat(values['x']) and isConvertibleToFloat(values['y']):
                        x = float(values['x'])
                        y = float(values['y'])
                        self.editor._select.updatePosition(x, y)
                    else:
                        self.windowHandler.createPopUpWindow(Windows.InfoPopUp, event,
                                                             message='Given values are no numbers!')
                        return
                    if lightId != self.editor._select.getId():
                        changeLight = self.editor.activeMap.updateTrafficLightId(self.editor._select, lightId)
                        if not changeLight: #ToDo check for doubled light id
                            self.windowHandler.createPopUpWindow(Windows.InfoPopUp, event,
                                                                 message='Cannot change ID because traffic light ID already exist')
            else:
                return

    def chargingStationInfoEvent(self, event, chargingStation=None):
        if self.editor.activeMap.isChargingStation(chargingStation):
            self.editor._select = chargingStation
            popUpCreated = self.windowHandler.createPopUpWindow(Windows.ChargingStationPopUp, event, self.editor._select)
            if popUpCreated:
                values = self.windowHandler.getPopUpValues()
                if values is not None:
                    chargerId = values['id']
                    if isConvertibleToFloat(values['x']) and isConvertibleToFloat(values['y']):
                        x = float(values['x'])
                        y = float(values['y'])
                        self.editor._select.updatePosition(x, y)
                    else:
                        self.windowHandler.createPopUpWindow(Windows.InfoPopUp, event,
                                                             message='Given values are no numbers!')
                        return
                    if chargerId != self.editor._select.getId():
                        changeLight = self.editor.activeMap.updateChargingStationId(self.editor._select, chargerId)
                        if not changeLight: #ToDo check for doubled light id
                            self.windowHandler.createPopUpWindow(Windows.InfoPopUp, event,
                                                                 message='Cannot change ID because charging station ID already exist')
            else:
                return

    def resetViewEvent(self, event):
        self.editor.updateDrawingLimits()

    def movingViewEvent(self, event, dx=None, dy=None):  # ToDo: Currently bug due to switch to PySimpleGui Key Events
        if dx is None and dy is None:
            if event in ['up', 'Up']:
                dx = 0.0
                dy = 0.5 * self.editor._majorTickStep
            elif event in ['down', 'Down']:
                dx = 0.0
                dy = -0.5 * self.editor._majorTickStep
            elif event in ['right', 'Right']:
                dx = 0.5 * self.editor._majorTickStep
                dy = 0.0
            elif event in ['left', 'Left']:
                dx = -0.5 * self.editor._majorTickStep
                dy = 0.0
        self.editor.moveView(dx, dy)

    def modeToggleEvent(self, mode, deleteSelect=False):
        if self.editor._mode == mode:
            self.editor._mode = Mode.normal
        else:
            self.editor._mode = mode
        if deleteSelect:
            self.editor.deselectObject()

    def entryLocationEvent(self, event):
        event = self.windowHandler.defineEntryLocation(self.editor._entryLocation, self.editor._subordinatedGates)
        if event == 'Add Gate':
            self.editor._mode = Mode.gate
        elif event == 'Add Entry Location':
            self.editor._mode = Mode.entryLocation
        else:
            return

    def deleteEvent(self, event):
        if self.editor._select is not None:
            if self.editor.activeGraph.isNode(self.editor._select):
                self.editor.activeMap.deleteAccessNode(self.editor.activeGraph, self.editor._select)
                self.editor.activeMap.deleteNode(self.editor._select, self.editor.activeGraph)
            elif self.editor.activeGraph.isEdge(self.editor._select):
                self.editor.activeGraph.deleteEdge(self.editor._select)
            elif self.editor.activeMap.isStation(self.editor._select):
                self.editor.activeMap.deleteStation(self.editor._select)
            elif self.editor.activeMap.isTrafficLight(self.editor._select):
                self.editor.activeMap.deleteTrafficLight(self.editor._select)
            elif self.editor.activeMap.isChargingStation(self.editor._select):
                self.editor.activeMap.deleteChargingStation(self.editor._select)
            elif 'polygon' in self.editor._select:
                self.editor.deletePolygon(self.editor._select)
            self.editor.deselectObject()

    def createEvent(self, event):
        if self.editor._mode == Mode.environment and not self.editor._polygonMode:
            self.editor._polygonMode = True
            if self.editor._select is not None:
                self.editor._selectedPoints.append(self.editor._select)
        elif self.editor._mode == Mode.environment and self.editor._polygonMode:
            if len(self.editor._selectedPoints) >= 3:
                self.editor.createPolygon(self.editor._selectedPoints)
                self.editor._selectedPoints = []
                self.editor._select = None
                self.editor._polygonMode = False

        elif self.editor._mode == Mode.trajectory and self.editor._select is not None:
            startNode, endNode = self.editor.getEdgeNodes(self.editor._select)
            dX = endNode['x'] - startNode['x']
            dY = endNode['y'] - startNode['y']
            lenEdge = math.sqrt(dX**2+dY**2)
            controlPoint = {
                'x': startNode['x'],
                'y': endNode['y']
            }
            self.editor.createTrajectory(edgeId=self.editor._select['id'], controlPoints=[[startNode['x'], startNode['y'], 0], [controlPoint['x'], controlPoint['y'], 0], [endNode['x'], endNode['y'], 0]], weights=[0, 2, 0])

        else:
            createdPopUp = self.windowHandler.createPopUpWindow(Windows.CreateNodePopUp, event)
            if createdPopUp:
                nodeId, x, y = self.windowHandler.getPopUpValues()
                if nodeId is None and x is None and y is None:
                    return
                else:
                    self.editor.activeGraph.createNode(nodeX=x, nodeY=y, nodeId=nodeId, inLocalCoordinates=self.editor._showGraphInLocalCoordinateSystem)

    def splitEdgesEvent(self, event):
        self.editor.activeGraph.splitEdges()

    def splitEdgeEvent(self, event):
        if self.editor.activeGraph.isEdge(self.editor._select):
            self.editor.activeGraph.splitEdge(edgeId=self.editor._select['id'], limit=self.editor.edgeLengthLimit)

    def voronoiEvent(self, event):
        newPoints = self.editor._outerPolygon['polygon'].splitBorders(self.editor._pointInterval)
        for newPoint in newPoints:
            self.editor.createPoint(newPoint[0], newPoint[1])
        for polygon in self.editor._polygons:
            newPoints = polygon['polygon'].splitBorders(self.editor._pointInterval)
            for newPoint in newPoints:
                self.editor.createPoint(newPoint[0], newPoint[1])
        MedialAxis.main(self.editor)

    def saveProjectEvent(self, event):
        createdPopUp = self.windowHandler.createPopUpWindow(Windows.SelectFolderPopUp, event)
        if createdPopUp:
            projectDir, projectName = self.windowHandler.getPopUpValues()
            if projectDir is not None:
                self.editor._project.saveProject(projectDir, projectName)
                self.windowHandler.createPopUpWindow(Windows.InfoPopUp, event, message='Project saved!')

    def loadProjectEvent(self, event):
        pass

    def saveMapEvent(self, event):
        popUpCreated = self.windowHandler.createPopUpWindow(Windows.SavePopUp, event)
        if popUpCreated:
            filename, parkingSpotAsBoolean = self.windowHandler.getPopUpValues()
            if filename is not None:
                try:
                    self.editor.saveMap(filename, parkingSpotAsBoolean)
                    self.windowHandler.createPopUpWindow(Windows.InfoPopUp, event, message='Map saved!')
                except PermissionError:
                    self.windowHandler.createPopUpWindow(Windows.InfoPopUp, event,
                                                         message='No permission to write there.')
        else:
            return

    def loadMapEvent(self, event):
        popUpCreated = self.windowHandler.createPopUpWindow(Windows.LoadPopUp, event)
        if popUpCreated:
            filename = self.windowHandler.getPopUpValues()
            print('Map opend with name', filename)
            if filename is not None:
                self.editor.loadMap(filename)
        else:
            return

    def mergeMapEvent(self, event):
        popUpCreated = self.windowHandler.createPopUpWindow(Windows.LoadPopUp, event)
        if popUpCreated:
            filename = self.windowHandler.getPopUpValues()
            print('Map opend with name', filename)
            if filename is not None:
                self.editor.mergeMap(filename)
        else:
            return

    def importMapEvent(self, event, mergeGraphs, updateCurrent=False):
        createdPopUp = self.windowHandler.createPopUpWindow(Windows.ImportExternalMapPopUp, event)
        if createdPopUp:
            filename, vendor, createNurbs = self.windowHandler.getPopUpValues()
            print('Map opened for import with name', filename)
            changes = list()
            if filename is not None:
                changes = self.editor.importMap(filename, vendor, mergeGraphs=mergeGraphs, mergeIntoExistingGraph=updateCurrent)
            if updateCurrent:
                if changes:
                    self.windowHandler.createPopUpWindow(Windows.ChangesInfoPopUp, event, changes=changes)
                else:
                    self.windowHandler.createPopUpWindow(Windows.InfoPopUp, event,
                                                         message='The current graph is identical to the imported data!')
            if createNurbs:
                try:
                    trajectoryInterpolator = MapGeneratorConverter.TrajectoryInterpolator()
                    jsonStruct = trajectoryInterpolator.convertToNurbs(filename, vendor)
                    self.editor.activeGraph.jsonStructToTrajectories(jsonStruct)
                    self.windowHandler.createPopUpWindow(Windows.InfoPopUp, event,
                                                         message='Trajectories stored to file!')
                except:
                    self.windowHandler.createPopUpWindow(Windows.InfoPopUp, event,
                                                         message='Could not create trajectories file out of data!')
        else:
            return

    def editMapEvent(self, event):
        self.editor.deselectObject()
        self.editor.drawCanvas()
        self.windowHandler.createPopUpWindow(Windows.EditMapPopUp, event, self.editor.edgeLengthLimit)
        values = self.windowHandler.getPopUpValues()
        if values is not None:
            if isConvertibleToFloat(values['longitude']) and isConvertibleToFloat(values['latitude']):
                self.editor.activeMap.longitude = float(values['longitude'])
                self.editor.activeMap.latitude = float(values['latitude'])

    def saveEnvironmentEvent(self, event):
        filename = self.windowHandler.savePopup()
        if filename is not None:
            self.editor.saveEnvironment(filename)
            self.windowHandler.createPopUpWindow(Windows.InfoPopUp, event,
                                                 message='Environment saved!')

    def openBackgroundEvent(self, event, pixelToMeters=1.0):
        self.windowHandler.createPopUpWindow(popUpClass=Windows.OpenBackgroundPopUp, eventInfo=event, pixelToMeters=pixelToMeters)
        filename, pixelToMeters = self.windowHandler.getPopUpValues()
        if filename is not None:
            if isConvertibleToFloat(pixelToMeters):
                try:
                    self.editor.background = Background()
                    self.editor.background.addFile(filename)
                    self.editor.background.openImage()
                    self.editor.background.setPixelToMeters(float(pixelToMeters))
                    background_xlim, background_ylim = self.editor.background.mapLimits()
                    self.editor.sizeFactorMap(0, background_xlim, 0, background_ylim)
                    self.editor.updateTicks(newScale=True)
                    self.editor.updateButtonDist()
                except ValueError as error:
                    print(error)
            else:
                self.windowHandler.createPopUpWindow(Windows.InfoPopUp, event,
                                                     message='Meters per pixel is not a number!')

    def deleteBackgroundEvent(self, event):
        if self.editor.background is not None:
            self.editor.background.deleteBackground()

    def editBackgroundEvent(self, event):
        createdPopUp = self.windowHandler.createPopUpWindow(Windows.EditBackgroundPopUp, event)
        if createdPopUp and self.editor.background:
            transposeX = transposeY = 0
            flipEdit, transposeX, transposeY = self.windowHandler.getPopUpValues()
            if flipEdit in ['horizontal', 'vertical']:
                self.editor.background.flip(flipEdit)
            else:
                self.editor.background.transpose(transposeX, transposeY)

    def rescaleEvent(self, event):
        createdPopUp = self.windowHandler.createPopUpWindow(Windows.ScalePopUp, event)
        if createdPopUp:
            unit, scale = self.windowHandler.getPopUpValues()
            if unit and scale:
                self.editor.rescale(unit, scale)

    def movingViewEvent(self, event, dx=None, dy=None):
        if dx is None and dy is None:
            if event == 'up':
                dx = 0.0
                dy = 0.5 * self.editor._majorTickStep
            elif event == 'down':
                dx = 0.0
                dy = -0.5 * self.editor._majorTickStep
            elif event == 'right':
                dx = 0.5 * self.editor._majorTickStep
                dy = 0.0
            elif event == 'left':
                dx = -0.5 * self.editor._majorTickStep
                dy = 0.0
        self.editor.moveView(dx, dy)

    def nodeTableInfoEvent(self, event):
        createdPopUp = self.windowHandler.createPopUpWindow(Windows.NodeTablePopUp, event, self.editor.activeGraph._nodes, self.editor._showGraphInLocalCoordinateSystem)
        return

    def deleteAllEvent(self, event):
        createdPopUp = self.windowHandler.createPopUpWindow(Windows.SetBackPopUp, event)
        if createdPopUp:
            answer = self.windowHandler.getPopUpValues()
            if answer:
                if answer == 'Yes':
                    self.editor.deleteAll()
                elif answer == 'No':
                    return

    def lockNodesEvent(self, event):
        self.editor._lockNodes = not self.editor._lockNodes

    def groupEditingEvent(self, event):
        createdPopUp = self.windowHandler.createPopUpWindow(Windows.GroupEditingPopUp, event, self.editor._map._stations, self.editor._map._groups)
        if createdPopUp:
            self.windowHandler.getPopUpValues()

    def groupDictToGroups(self, groupDict):
        for groupId, stations in groupDict.items():
            group = self.editor.activeMap.getGroupById(groupId=groupId)
            if not group:
                group = self.editor.activeMap.createGroup(groupId=groupId)
            for stationId in stations:
                self.editor.activeMap.addStationToGroupById(group=group, stationId=stationId)

    def logStructureCreateEvent(self, event):
        logStructure = LOGEditor.LogStruct('structure')
        LOGEditor.convertMap(logStructure, self.editor.activeMap._groups, self.editor.activeMap._stations,
                             self.editor.activeMap._trafficLights, self.editor.activeMap._chargingStations)
        createdPopUp = self.windowHandler.createPopUpWindow(Windows.SaveLogStructurePopUp, event)
        if createdPopUp:
            filename = self.windowHandler.getPopUpValues()
            if filename is not None:
                name, path = self.editor.getFileName(filename)
                LOGEditor.JsonLogStructureWriter(logStructure.structure, path, name)

    def mirrorDependenciesEvent(self, event):
        print('Mirror dependencies of node:', self.editor._select['id'], 'to all dependant nodes')
        if self.editor.activeGraph.isNode(self.editor._select):
            HelperFunctions.generateMirroredDependencies(self.editor.activeGraph, self.editor._select)

    def closeNodeDependenciesEvent(self, event):
        radius = 1.8
        print('Determine to close nodes with radius', radius, 'and creating dependencies:....')
        HelperFunctions.generateDependenciesForToCloseNodes(self.editor.activeGraph._nodes, radius)
        print('Done!')

    def intersectingEdgesDependenciesEvent(self, event):
        print('Determine intersecting edges and creating dependencies:....')
        HelperFunctions.generateDependenciesForIntersectingEdges(self.editor.activeGraph._nodes, self.editor.activeGraph._edges)
        print('Done!')

    def clearSelfDependenciesEvent(self, event):
        print('Clearing self dependencies:....')
        HelperFunctions.clearSelfDependencies(self.editor.activeGraph._nodes)
        print('Done!')

    def importLogsEvent(self, event):
        print('import logs event')
        popUpCreated = self.windowHandler.createPopUpWindow(Windows.LoadPopUp, event)
        if popUpCreated:
            filename = self.windowHandler.getPopUpValues()
            print(filename)
            if filename is not None:
                name, path = self.editor.getFileName(filename)
                LogFileImport.importLogs(self.editor.activeMap, path, name)
        else:
            return

    def optionsEvent(self, event):
        createdPopUp = self.windowHandler.createPopUpWindow(Windows.OptionsPopup, event,
                                                            self.editor.edgesCanIntersect,
                                                            self.editor._dependenciesInNeighborhood,
                                                            self.editor._gridSnapping, self.editor._gridSize,
                                                            self.editor._user)
        if createdPopUp:
            values = self.windowHandler.getPopUpValues()
            if values is None:
                return
            self.editor.edgesCanIntersect = values['edgeIntersecting']
            self.editor._gridSnapping = values['gridSnapping']
            self.editor._dependenciesInNeighborhood = values['neighborhoodEditing']
            self.editor._showLocalCoordinateSystem = values['showCoordinateSystem']
            self.editor._showGraphInLocalCoordinateSystem = values['showInLocalCoordinates']
            self.editor._showTrajectories = values['showTrajectory']
            self.editor._user = values['user']
            if values['gridSize']:
                self.editor._gridSize = float(values['gridSize'])

    def switchActiveGraphEvent(self, event, values):
        if isinstance(values, str):
            graph = self.windowHandler.editor.activeMap.getNavigationGraphById(values)
        else:
            graph = values
        if graph is not None:
            self.windowHandler.editor.activeGraph = graph
            self.editor.deselectObject()

    def addGraphEvent(self, event):
        newGraph = self.editor.activeMap.createNavigationGraph(newGraphId=None)
        self.switchActiveGraphEvent(event, newGraph)

    def removeGraphEvent(self, event):
        self.editor.activeMap.deleteNavigationGraph(self.editor.activeGraph)
        if not self.editor._map.hasNavigationGraph():
            self.addGraphEvent(event)
        self.switchActiveGraphEvent(event, self.editor.activeMap.navigationGraphs[0])

    def agvTypesEvent(self, event):
        self.windowHandler.createPopUpWindow(Windows.EditAgvTypesGraphPopUp, event, self.editor.activeGraph.getAgvTypes())

    def graphEditEvent(self, event):
        createdPopUp = self.windowHandler.createPopUpWindow(Windows.GraphEditPopUp, event,
                                                            self.editor.activeGraph.getId(),
                                                            self.editor.activeGraph._idManager._idOption)
        if createdPopUp:
            values = self.windowHandler.getPopUpValues()
            if values is None:
                return
            if self.editor.activeGraph._idManager.idOption.name != values['idOption']:
                self.editor.activeGraph._idManager.idOption = IdManagement.IdOption[values['idOption']]
                self.editor.activeGraph._idManager.updateIdList(self.editor.activeGraph._nodes)
            if isConvertibleToFloat(values['translationX']) and isConvertibleToFloat(values['translationY']) and isConvertibleToFloat(values['rotationZ']):
                transX = float(values['translationX'])
                transY = float(values['translationY'])
                rotZ = float(values['rotationZ'])
                self.editor.activeGraph.coordinateTransformation = MapComponents.CoordinateTransformation(transX, transY, rotZ)
            if isConvertibleToFloat(values['inputMaxLength']):
                self.windowHandler.editor.setEdgeLimit(float(values['inputMaxLength']))
            self.editor.activeGraph.setId(values['graphName'])

    def leftButtonEvent(self, event):
        # Edge Mode
        if self.editor._mode == Mode.edge and self.editor.activeGraph.isNode(self.editor._select):
            closestObject = self.editor.closeObject(event.xdata, event.ydata)
            if self.editor.activeGraph.isNode(closestObject):
                if not self.editor.activeGraph.testEdgeExists(self.editor._select, closestObject):
                    potentialIntersection = self.editor.activeGraph.testEdgeIntersect(self.editor._select, closestObject)
                    if self.editor.edgesCanIntersect and potentialIntersection or not potentialIntersection:
                        self.editor.activeGraph.createEdge(self.editor._select, closestObject)
                    else:
                        self.windowHandler.createPopUpWindow(Windows.InfoPopUp, event,
                                                             message='New edge would intersect with an other edge!')
                else:
                    self.windowHandler.createPopUpWindow(Windows.InfoPopUp, event,
                                                         message='Edge does already exist!')
            self.editor._select = None
        # Environment Mode
        elif self.editor._mode == Mode.environment and not self.editor._polygonMode:
            selectedObject = self.editor.closeObject(event.xdata, event.ydata)
            if selectedObject != None:
                self.editor._select = selectedObject
            else:
                self.editor._select = None

        # Trajectory Mode
        elif self.editor._mode == Mode.trajectory:
            selectedObject = self.editor.closeObject(event.xdata, event.ydata)
            if selectedObject is not None and 'startNodeId' in selectedObject:
                self.editor._select = selectedObject
            else:
                self.editor._select = None

        #Station Mode
        elif self.editor._mode == Mode.stations and self.editor._select is not None:
            if self.editor.activeMap.isStation(self.editor._select):
                closeObject = self.editor.closeObject(event.xdata, event.ydata)
                if self.editor.activeGraph.isNode(closeObject):
                    if closeObject not in self.editor._selectRelatives:
                        self.editor._select.assignNode(self.editor.activeGraph, closeObject)
                    else:
                        self.editor._select.deleteNodeAssignment(self.editor.activeGraph.getId(), closeObject['id'])
                    self.editor._selectRelatives = self.editor.getObjectRelatives(self.editor._select)
                else:
                    self.editor._select = self.editor.closeObject(event.xdata, event.ydata)
                    self.editor._selectRelatives = self.editor.getObjectRelatives(self.editor._select)
            else:
                self.editor._select = self.editor.closeObject(event.xdata, event.ydata)
                self.editor._selectRelatives = self.editor.getObjectRelatives(self.editor._select)

        # Charger Mode
        elif self.editor._mode == Mode.chargers and self.editor._select is not None:
            if self.editor.activeMap.isChargingStation(self.editor._select):
                closeObject = self.editor.closeObject(event.xdata, event.ydata)
                if self.editor.activeGraph.isNode(closeObject):
                    if closeObject not in self.editor._selectRelatives:
                        self.editor._select.assignNode(self.editor.activeGraph, closeObject)
                    else:
                        self.editor._select.deleteNodeAssignment(self.editor.activeGraph.getId(), closeObject['id'])
                    self.editor._selectRelatives = self.editor.getObjectRelatives(self.editor._select)
                else:
                    self.editor._select = self.editor.closeObject(event.xdata, event.ydata)
                    self.editor._selectRelatives = self.editor.getObjectRelatives(self.editor._select)
            else:
                self.editor._select = self.editor.closeObject(event.xdata, event.ydata)
                self.editor._selectRelatives = self.editor.getObjectRelatives(self.editor._select)

        # Else
        else:
            self.editor._select = self.editor.closeObject(event.xdata, event.ydata)
            self.editor._selectRelatives = self.editor.getObjectRelatives(self.editor._select)
            self.editor._pointingDependentNodes = list()
            if self.editor.activeGraph.isNode(self.editor._select) and self.editor._mode == Mode.dependencies:
                self.editor._pointingDependentNodes = self.editor.activeGraph.getPointingDependentNodes(
                    self.editor._select)

    def middleButtonEvent(self, event):
        pass

    def rightButtonEvent(self, event):
        x = event.xdata
        y = event.ydata
        if self.editor._gridSnapping and self.editor._mode != Mode.dependencies:
            x, y = self.editor.snapCoordinates(x, y)
        if event.xdata and event.ydata:
            if self.editor._mode == Mode.edge and self.editor.activeGraph.isNode(self.editor._select):
                node = self.editor.activeGraph.createNode(nodeX=x, nodeY=y, inLocalCoordinates=self.editor._showGraphInLocalCoordinateSystem)
                potentialIntersection = self.editor.activeGraph.testEdgeIntersect(self.editor._select, node)
                if self.editor.edgesCanIntersect and potentialIntersection or not potentialIntersection:
                    self.editor.activeGraph.createEdge(self.editor._select, node)
                else:
                    self.editor._nodes.remove(self.editor.closeObject(x, y))
                    self.windowHandler.createPopUpWindow(Windows.InfoPopUp, event,
                                                         message='New edge would intersect with other edge!')

            elif self.editor._mode == Mode.environment and self.editor._polygonMode:
                if self.editor.closeObject(x, y) is None:
                    self.editor.createPoint(x, y)
                    self.editor._select = self.editor.closeObject(x, y)
                    self.editor._selectedPoints.append(self.editor._select)
                    self.editor.MapCanvas()
                else:
                    self.windowHandler.createPopUpWindow(Windows.InfoPopUp, event,
                                                         message='There cannot be placed a point here!')
                    # Dependencies Mode
            elif self.editor._mode == Mode.dependencies and self.editor._select is not None:
                if self.editor.activeGraph.isNode(self.editor._select):
                    closeObject = self.editor.closeObject(event.xdata, event.ydata)
                    closeNeighbor = self.editor.closeNeighbor(event.xdata, event.ydata)
                    if self.editor._dependenciesInNeighborhood:
                        if closeNeighbor != (None, None):
                            print('selected Neighbor')
                            possibleDependency = MapComponents.Dependency(nodeId=closeNeighbor[1]['id'], navGraph=closeNeighbor[0])
                            possiblePointingDependency = MapComponents.Dependency(nodeId=self.editor._select['id'],
                                                                                  navGraph=self.editor.activeGraph)
                            if not self.editor.activeGraph.hasDependency(self.editor._select, possibleDependency) and not closeNeighbor[0].hasDependency(closeNeighbor[1], possiblePointingDependency):
                                self.editor.activeGraph.addDependencyToNode(node=self.editor._select, dependantNode=closeNeighbor[1], navGraph=closeNeighbor[0])
                            elif self.editor.activeGraph.hasDependency(self.editor._select, possibleDependency) and not closeNeighbor[0].hasDependency(closeNeighbor[1], possiblePointingDependency):
                                closeNeighbor[0].addDependencyToNode(node=closeNeighbor[1], dependantNode=self.editor._select, navGraph=self.editor.activeGraph)
                            elif self.editor.activeGraph.hasDependency(self.editor._select, possibleDependency) and closeNeighbor[0].hasDependency(closeNeighbor[1], possiblePointingDependency):
                                self.editor.activeGraph.removeDependencyFromNode(node=self.editor._select, dependantNode=closeNeighbor[1], navGraph=closeNeighbor[0])
                            elif not self.editor.activeGraph.hasDependency(self.editor._select, possibleDependency) and closeNeighbor[0].hasDependency(closeNeighbor[1], possiblePointingDependency):
                                closeNeighbor[0].removeDependencyFromNode(node=closeNeighbor[1], dependantNode=self.editor._select, navGraph=self.editor.activeGraph)

                        else:
                            self.editor._select = self.editor.closeObject(event.xdata, event.ydata)
                            self.editor._selectRelatives = self.editor.getObjectRelatives(self.editor._select)
                            self.editor._pointingDependentNodes = list()
                    elif self.editor.activeGraph.isNode(closeObject) and closeObject != self.editor._select:
                        if closeObject not in self.editor._selectRelatives and closeObject not in self.editor._pointingDependentNodes:
                            self.editor.activeGraph.addDependencyToNode(self.editor._select, closeObject)
                        elif closeObject in self.editor._selectRelatives and closeObject not in self.editor._pointingDependentNodes:
                            self.editor.activeGraph.addDependencyToNode(closeObject, self.editor._select)
                        elif closeObject in self.editor._selectRelatives and closeObject in self.editor._pointingDependentNodes:
                            self.editor.activeGraph.removeDependencyFromNode(self.editor._select, closeObject)
                        elif closeObject not in self.editor._selectRelatives and closeObject in self.editor._pointingDependentNodes:
                            self.editor.activeGraph.removeDependencyFromNode(closeObject, self.editor._select)
                        self.editor._selectRelatives = self.editor.getObjectRelatives(self.editor._select)
                        self.editor._pointingDependentNodes = self.editor.activeGraph.getPointingDependentNodes(
                            self.editor._select)

                else:
                    self.editor._select = self.editor.closeObject(event.xdata, event.ydata)
                    self.editor._selectRelatives = self.editor.getObjectRelatives(self.editor._select)
                return
            elif self.editor._mode == Mode.stations:
                self.editor.activeMap.createStation(x, y)
            elif self.editor._mode == Mode.lights:
                self.editor.activeMap.createTrafficLight(x, y)
            elif self.editor._mode == Mode.chargers:
                self.editor.activeMap.createChargingStation(x, y)
            else:
                self.editor.activeGraph.createNode(nodeX=x, nodeY=y, inLocalCoordinates=self.editor._showGraphInLocalCoordinateSystem)
            self.editor.deselectObject()
        else:
            return

    def wheelButtonEvent(self, event, zoom_scale=2.):
        if event.button == 'up':
            scale_factor = 1 / zoom_scale
        elif event.button == 'down':
            scale_factor = zoom_scale
        self.editor.zoomView(event.xdata, event.ydata, scale_factor)

    def GUIButtonEvent(self, event, values):
        #split in case of menu key
        try:
            event = event.split('::')[-1]
            if event == 'openProject':
                return
            elif event == 'saveProject':
                self.saveProjectEvent(event)
            elif event == 'edgeMode':
                self.modeToggleEvent(Mode.edge)
            elif event == 'dependenciesMode':
                self.modeToggleEvent(Mode.dependencies, deleteSelect=True)
            elif event == 'relationsMode':
                self.modeToggleEvent(Mode.entryLocation, deleteSelect=True)
            elif event == 'nodeTypeMode':
                self.modeToggleEvent(Mode.nodeType, deleteSelect=True)
            elif event == 'resetView':
                self.resetViewEvent(event)
            elif event == 'mapOpen':
                self.loadMapEvent(event)
            elif event == 'mapSave':
                self.saveMapEvent(event)
            elif event == 'mapImportAsGraphs':
                self.importMapEvent(event, mergeGraphs=True)
            elif event == 'mapImportAsMap':
                self.importMapEvent(event, mergeGraphs=False)
            elif event == 'mapImportUpdateCurrent':
                self.importMapEvent(event, mergeGraphs=False, updateCurrent=True)
            elif event == 'mapEdit':
                self.editMapEvent(event)
            elif event == 'mapMerge':
                self.mergeMapEvent(event)
            elif event == 'nodeList':
                self.nodeTableInfoEvent(event)
            elif event == 'backgroundOpen':
                self.openBackgroundEvent(event)
            elif event == 'backgroundEdit':
                self.editBackgroundEvent(event)
            elif event == 'backgroundDelete':
                self.deleteBackgroundEvent(event)
            elif event == 'lockNodes':
                self.lockNodesEvent(event)
            elif event == 'logstructer':
                self.logStructureCreateEvent(event)
            elif event == 'options':
                self.optionsEvent(event)
            elif event == 'stations':
                self.modeToggleEvent(Mode.stations, deleteSelect=True)
            elif event == 'groups':
                self.groupEditingEvent(event)
            elif event == 'lights':
                self.modeToggleEvent(Mode.lights, deleteSelect=True)
            elif event == 'charger':
                self.modeToggleEvent(Mode.chargers, deleteSelect=True)
            elif event == 'activeGraph':
                self.switchActiveGraphEvent(event, values['activeGraph'])
            elif event == 'activeGraphMap':
                self.switchActiveGraphEvent(event, values['activeGraphMap'])
            elif event == 'addGraph':
                self.addGraphEvent(event)
            elif event == 'removeGraph':
                self.removeGraphEvent(event)
            elif event == 'agvTypes':
                self.agvTypesEvent(event)
            elif event == 'graphEdit':
                self.graphEditEvent(event)
            elif event == 'importChanges':
                self.importLogsEvent(event)
            else:
                return
        except Exception as error:
            print(f'Error while processing GUI button event \'{event}\': {error}')
        self.editor.drawCanvas()

    def onButtonEvents2(self, event):
        # left mouse Button
        if event.button == 1:
            self.leftButtonEvent(event)

        # middle mouse Button
        elif event.button == 2:
            self.middleButtonEvent(event)

        # right mouse Button
        elif event.button == 3:
            self.rightButtonEvent(event)

    def onButtonEvents(self, event):
        # left mouse Button
        if event.button == 1 and event.inaxes == self.editor._ax:
            self.leftButtonEvent(event)

        # middle mouse Button
        elif event.button == 2 and event.inaxes == self.editor._ax:
            self.middleButtonEvent(event)

        # right mouse Button
        elif event.button == 3 and event.inaxes == self.editor._ax:
            self.rightButtonEvent(event)

    def onScrollEvents(self, event):
        # wheel up
        if event.button == 'up' and event.inaxes == self.editor._ax:
            self.wheelButtonEvent(event)

        # wheel down
        elif event.button == 'down' and event.inaxes == self.editor._ax:
            self.wheelButtonEvent(event)

        self.editor.drawMap()

    def onKeyEvents(self, event):
        try:
            event = event.split(':')[0]
            # edgeMode
            if event == 'e':
                self.infoEvent(event, self.editor._select)

            # environmentMode
            if event == 'u':
                return
                #self.modeToggleEvent(Mode.environment)

            # gateMode
            if event == 'g':
                return
                #self.modeToggleEvent(Mode.gate)

            # nodeType
            if event == 't':
                self.modeToggleEvent(Mode.nodeType, deleteSelect=True)

            # trajectories
            if event == 'q':
                self.modeToggleEvent(Mode.trajectory, deleteSelect=True)

            # entryLocation Mode
            if event == 'x':
                return
                self.modeToggleEvent(Mode.entryLocation, deleteSelect=True)

            # delete
            if event == 'delete' or event == 'Delete' or event == 'BackSpace':
                self.deleteEvent(event)

            # create new object
            if event == 'n':
                self.createEvent(event)

            # voronoi
            if event == 'v':
                return
                #self.voronoiEvent(event)

            # save Map
            if event == 's':
                self.saveMapEvent(event)

            # load Map
            if event == 'o':
                self.loadMapEvent(event)

            # save environment
            if event == 'a':
                self.saveEnvironmentEvent(event)

            # open background
            if event == 'b':
                self.openBackgroundEvent(event)

            # node table info
            if event == 'l':
                self.nodeTableInfoEvent(event)

            # rescale
            if event == 'r':
                self.rescaleEvent(event)

            # split edges
            if event == 'y':
                self.splitEdgeEvent(event)

            if event == 'z':
                print('Make Johannes happy again!')

            # Delete hole Map
            if event == 'escape' or event == 'Escape':
                self.deleteAllEvent(event)

            if event in ['up', 'Up', 'down', 'Down', 'left', 'Left', 'right', 'Right']:
                self.movingViewEvent(event)

            # Helper functions
            if event == 'D':
                self.mirrorDependenciesEvent(event)

            if event == 'O':
                self.closeNodeDependenciesEvent(event)

            if event == 'X':
                self.intersectingEdgesDependenciesEvent(event)

            if event == 'C':
                self.clearSelfDependenciesEvent(event)

            if event == 'K':
                HelperFunctions.accessNodeDistanceCheck(self.editor.activeMap)

            if event == 'A':
                HelperFunctions.accessNodeDistanceCheckRemove(self.editor.activeMap)

        except Exception as errorKeyEvent:
            print('Error while processing key event:', errorKeyEvent, 'with event:', event)
        # refresh Map Window
        self.editor.drawCanvas()

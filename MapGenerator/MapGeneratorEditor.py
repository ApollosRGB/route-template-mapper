# -*- coding: utf-8 -*-
"""
Created on Fri Oct  4 15:38:13 2019

@author: DanielKampen
"""

import matplotlib
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import matplotlib.patches as patches
import uuid
import math
import numpy as np
import copy
import os
from shapely.geometry import LineString
import VectorOperations
from Polygon import Polygon
import MapGeneratorJson
import MapGeneratorSVG
import MapGeneratorNURBS
import MapEditorDesign
import MapGeneratorEditorWindows as Windows
import MapGeneratorEditorEvents as Events
from MapGeneratorMode import Mode
import MapGeneratorProject
import Periphery
import HelperFunctions
import MapComponents
import MapGeneratorConverter
import warnings
from enum import Enum
from time import process_time, perf_counter

warnings.filterwarnings("ignore", "(?s).*MATPLOTLIBDATA.*", category=UserWarning)
matplotlib.use('TkAgg')
matplotlib.rcParams['toolbar'] = 'None'


class NodeIdOption(Enum):
    fourDigits = 1
    eightDigits = 2


class MapGeneratorEditor:

    #ToDo: set constants for FIG_SIZE and MAP_SIZE
    def __init__(self, fig_size_x=12.5, fig_size_y=7.25, map_size_x=10.875, map_size_y=7.25):

        # Create WindowHandler
        self.windowHandler = Windows.WindowHandler(self)

        # Create EventHandler
        self.eventHandler = Events.EventHandler()
        self.eventHandler.addEditor(self)

        # Main Window
        self._mainWindow = None
        self.active = True

        # Fig Connectors
        self._onPressConnector = None
        self._onReleaseConnector = None
        self._onMoveConnector = None
        self._onScrollConnector = None
        self._onCloseConnector = None

        # set size of map
        self._unit = 'meter'
        if not map_size_x:
            map_size_x = 10.875
        if not map_size_y:
            map_size_y = 7.25
        size_x = float(map_size_x)
        size_y = float(map_size_y)
        self.sizeFactorMap(0, size_x, 0, size_y)

        # general Options
        self._user = 'Unknown'
        self._edgesCanIntersect = True
        self._gridSnapping = False
        self._gridSize = 0.1
        self._dependenciesInNeighborhood = False

        # figure options and drawing references
        self._showLocalCoordinateSystem = True
        self._showGraphInLocalCoordinateSystem = False
        self._showTrajectories = False
        self._majorTickStep = 1
        self.tick_update = True
        self._scatter = None
        self._quiver = None
        self._selected_quiver = None
        self._ghostPlot = None
        self._ghostQuiver = None
        self._stationsScatter = None
        self._lightScatter = None
        self._chargingStationScatter = None
        self._coordinateSystemDraw = None
        self._trajectoryScatter = None
        self._neighborhoodNodePlot = None
        self._neighborhoodEdgesScatter = None

        # event helper
        self.press = False
        self.move = False
        self.drag = False
        self._moveX = 0
        self._moveY = 0
        self.pressOriginX = None
        self.pressOriginY = None
        self.pixelToTickRatio = None
        self._lockNodes = False
        
        # mode Options
        self._polygonMode = False
        self._mode = Mode.normal
        
        # select lists
        self._select = None
        self._selectRelatives = []
        self._pointingDependentNodes = []
        self._selectedPoints = []
        self._ghost = None
        self._ghostConnections = []
        
        # list of objects
        self._map = MapComponents.Map(None, None, 'Made with SYNAOS MapGenerator Editor', True)
        self._activeGraph = self.activeMap.navigationGraphs[0]
        self._neighborhoodNodes = list()
        self._neighborhoodEdgeInfo = list()
        self._points = []
        self._polygons = []
        self._outerPolygon = []
        self._trajectories = {}
        self.background = None
        self._entryLocation = None
        self._subordinatedGates = None

        # Create project
        self._project = MapGeneratorProject.MapProject(self, self.background)

        # initialization steps
        self._fig = None
        self._ax = None
        self.createOuterPolygon()
        self.initEditorFig(fig_size_x, fig_size_y)
        self.TKCanvas = None
        self.updatePixelTickRatio()

        # Distances and Sizes
        self._nodeDiameter = 7
        self._pointDiameter = 5
        self._pointInterval = 1
        self.edgeLengthLimit = 3
        self._buttonDist = 0
        self.updateButtonDist()

    @property
    def activeGraph(self):
        return self._activeGraph

    @activeGraph.setter
    def activeGraph(self, newActiveGraph: MapComponents.NavigationGraph):
        if isinstance(newActiveGraph, MapComponents.NavigationGraph) or newActiveGraph is None:
            self._activeGraph = newActiveGraph
            if self._activeGraph.getNodes():
                self.activeGraph.updateEdgeCoordinates()
                self.updateButtonDist()
        else:
            print('Internal error: Tried to switch to non existing graph!')

    @property
    def activeMap(self):
        return self._map

    @activeMap.setter
    def activeMap(self, newActiveMap):
        if isinstance(newActiveMap, MapComponents.Map) or newActiveMap is None:
            self._map = newActiveMap
            if self._map is not None:
                self.activeGraph = self._map.navigationGraphs[0]
                self.updateDrawingLimits(forceUpdate=True)
                self.updateButtonDist()
        else:
            print('Internal error: Tried to set active map to non existing map!')

    @property
    def edgesCanIntersect(self):
        return self._edgesCanIntersect

    @edgesCanIntersect.setter
    def edgesCanIntersect(self, newSetting):
        if isinstance(newSetting, bool):
            self._edgesCanIntersect = newSetting
        else:
            print('Internal error: Tried to set boolean option to none boolean value')

    def initEditorFig(self, sizeX=12.5, sizeY=7.25):
        # create Editor Window
        self._fig = matplotlib.pyplot.figure(figsize=(12.5, 7.25))  # 10.875
        if sizeX != 12.5:
            sizeY = sizeY / float(self._fig.get_dpi())
            sizeX = sizeX / float(self._fig.get_dpi())
            self._fig.set_size_inches(sizeX, sizeY)

        # create Editor Axis
        self._ax = self._fig.add_axes([0.03, 0.025, 0.95, 0.95])
        self.updateTicks(newScale=True)

    def activateEditor(self):
        self._mainWindow.activateEditorWindow()

    def deactivateEditor(self):
        self._mainWindow.deactivateEditorWindow()

    def figConnect(self):
        self._onPressConnector = self._fig.canvas.mpl_connect('button_press_event', self.onPress)
        self._onReleaseConnector = self._fig.canvas.mpl_connect('button_release_event', self.onRelease)
        self._onMoveConnector = self._fig.canvas.mpl_connect('motion_notify_event', self.onMove)
        self._onScrollConnector = self._fig.canvas.mpl_connect('scroll_event', self.onScroll)
        self._onCloseConnector = self._fig.canvas.mpl_connect('close_event', self.onClose)
        if self._mainWindow:
            self._mainWindow.window.TKroot.quit()

    def figDisconnect(self):
        self._fig.canvas.mpl_disconnect(self._onPressConnector)
        self._fig.canvas.mpl_disconnect(self._onReleaseConnector)
        self._fig.canvas.mpl_disconnect(self._onMoveConnector)
        self._fig.canvas.mpl_disconnect(self._onScrollConnector)
        self._fig.canvas.mpl_disconnect(self._onCloseConnector)

    def connectToFrontEnd(self, mainWindow):
        self._mainWindow = mainWindow

    def updateCanvas(self, TKCanvas):
        self.TKCanvas = TKCanvas
        return

    def drawCanvas(self):
        try:
            self.drawMap()
            self.TKCanvas.draw()
            self.TKCanvas.get_tk_widget().pack(side='top', fill=None, expand=False)
        except Exception as error:
            print('Error while drawing canvas:', error)

    def updateButtonDist(self):
        bbox = self._ax.get_window_extent().transformed(self._fig.dpi_scale_trans.inverted())
        width_inches, height_inches = bbox.width, bbox.height
        size_x, size_y = self.getViewSize()
        pointToInch = 1/72
        inchToMeter = width_inches / size_x
        pointToMeter = pointToInch / inchToMeter
        self._buttonDist = self._nodeDiameter * 1.2 * pointToMeter

    def updatePixelTickRatio(self):
        width, height = self.getAxSizePixel()
        self.pixelToTickRatio = (self._xlim_right - self._xlim_left) / width

    def getAxSizePixel(self):
        bbox = self._ax.get_window_extent().transformed(self._fig.dpi_scale_trans.inverted())
        width, height = bbox.width, bbox.height
        width *= self._fig.dpi
        height *= self._fig.dpi
        return width, height

    def onButton(self, event):
        self.eventHandler.onButtonEvents2(event)
        self.drawCanvas()

    def onPress(self, event):
        if event.dblclick:
            self.onDoubleClick(event)
            self.drawCanvas()
            return
        self.press = True
        self.pressOriginX = event.xdata
        self.pressOriginY = event.ydata
        position = self._ax.transData.transform((event.xdata, event.ydata))
        self._moveX = position[0]
        self._moveY = position[1]
        
    def onRelease(self, event):
        if event.dblclick:
            return
        if self.press and not self.move:
            self.press = False
            self.move = False
            self.drag = False
            self.onButton(event)
        else:
            self.press = False
            self.move = False
            self.drag = False
            self.onDrop(event)
        self.pressOriginX = None
        self.pressOriginY = None
        self._moveX = 0
        self._moveY = 0
        self.eventHandler.infoPanelUpdateEvent(event)

    def onDoubleClick(self, event):
        self.eventHandler.infoEvent(event, self._select)
        self.pressOriginX = None
        self.pressOriginY = None
        self._moveX = 0
        self._moveY = 0
        self.press = False
        self.move = False
        self.drag = False

    def onMove(self, event):
        self.eventHandler.infoPanelUpdateEvent(event)
        if self._mode == Mode.edge:
            self.eventHandler.moveEventEdgeMode(event)
        if event.inaxes and self.press:
            self.move = True
            self.onDrag(event)

    def onDrag(self, event):
        position = self._ax.transData.transform((event.xdata, event.ydata))
        dx = position[0] - self._moveX
        dy = position[1] - self._moveY
        if event.button == 1:
            self.eventHandler.leftButtonDrag(event, position, dx, dy)
        if event.button == 3:
            self.eventHandler.rightButtonDrag(event)

    def onDrop(self, event):
        if event.button == 1:
            self.eventHandler.leftButtonDrop(event)
        elif event.button == 3:
            self.eventHandler.rightButtonDrop(event)
        self.drawCanvas()

    def onScroll(self, event):
        self.eventHandler.onScrollEvents(event)
        self.drawCanvas()

    def onClose(self, event):
        #exit(0)
        return

    def getGraphListAsString(self):
        graphIdList = list()
        for graph in self.activeMap.navigationGraphs:
            graphIdList.append(str(graph._graphId))
        return graphIdList

    def snapCoordinates(self, x, y):
        x = round(x / self._gridSize) * self._gridSize
        y = round(y / self._gridSize) * self._gridSize
        return x, y

    def deleteAll(self):
        self.activeMap = MapComponents.Map()
        self._points = []
        self._polygons = []
        self._trajectories = {}
        self._select = None
        self._selectedPoints = []
        self._outerPolygon = []
        if self.background is not None:
            self.background.deleteBackground()
            self.background = None
        self.createOuterPolygon()

    def setEdgeLimit(self, limit):
        if limit:
            self.edgeLengthLimit = limit

    def createTrajectory(self, edgeId, controlPoints, weights): #ToDo: Put back to use
        self._trajectories[edgeId] = MapGeneratorNURBS.NURBS(controlPoints, weights)

    def deleteTrajectory(self, edgeId): #ToDo: Put back to use
        if edgeId in self._trajectories.keys():
            del(self._trajectories[edgeId])

    def updateTrajectory(self, edgeId, controlPoints, weights): #ToDo: Put back to use
        if controlPoints:
            self._trajectories[edgeId].setControlPoints(controlPoints, weights)
        
    def createPoint(self, x, y): #ToDo: Put back to use
        self._points.append({'id': str(uuid.uuid4()), 'x': x, 'y': y, 'z': 0})

    def getPoint(self, x, y): #ToDo: Put back to use
        for point in self._points:
            if point['x'] == x and point['y'] == y:
                return point
        return None

    def deletePoint(self, point): #ToDo: Put back to use
        self._points.remove(point)
        self._select = None
        
    def createPolygon(self, points): #ToDo: Put back to use
        vertices = []
        for point in points:
            vertices.append([point['x'], point['y']])
        self._polygons.append({'id': str(uuid.uuid4()), 'polygon': Polygon(vertices)})
        
    def deletePolygon(self, polygon): #ToDo: Put back to use
        for vertice in polygon['polygon'].getVertices():
            self.deletePoint(self.getPoint(vertice[0], vertice[1]))
        self._polygons.remove(polygon)
        self._select = None
        
    def createOuterPolygon(self): #ToDo: Put back to use
        vertices = [[self._xlim_left, self._ylim_bottom], [self._xlim_right, self._ylim_bottom], [self._xlim_right, self._ylim_top], [self._xlim_left, self._ylim_top]]
        self._outerPolygon = {'id': str(uuid.uuid4()), 'polygon': Polygon(vertices)}
        for vert in vertices:
            self.createPoint(vert[0], vert[1])

    def deselectObject(self):
        self._select = None
        self._selectRelatives = []
        self._pointingDependentNodes = []
        self._selectedPoints = []
        self._ghost = None
        self._ghostConnections = []
        self._neighborhoodNodes = list()
        self._neighborhoodEdgeInfo = list()

    def closeObject(self, x, y):
        sameNodeSelected = False
        if self._showGraphInLocalCoordinateSystem:
            eventX, eventY = self.activeGraph.coordinateTransformation.transformCoordinates(x, y)
        else:
            eventX = x
            eventY = y
        if self._mode == Mode.environment:
            if self._polygonMode:
                for point in self._points:
                    if math.sqrt(pow(point['x'] - x, 2) + pow(point['y'] - y, 2)) < self._buttonDist:
                        return point
            else:
                for polygon in self._polygons:
                    if polygon['polygon'].insidePolygon([[eventX, y]]):
                        return polygon

        elif self._mode == Mode.trajectory: #ToDo: Rework this
            for edge in self._edges:
                startNode, endNode = self.getEdgeNodes(edge)
                if VectorOperations.pnt2line((eventX, eventY), (startNode['mapX'], startNode['mapY']),
                                             (endNode['mapX'], endNode['mapY'])) < self._buttonDist * 2:
                    return edge

        elif self._mode == Mode.stations:
            for station in self.activeMap._stations:
                stationX, stationY = station.getPosition()
                if math.sqrt(pow(stationX - eventX, 2) + pow(stationY - eventY, 2)) < self._buttonDist:
                    if self._select != station:
                        return station
            if self._select is not None:
                for node in self.activeGraph.getNodes():
                    if math.sqrt(pow(node['mapX'] - eventX, 2) + pow(node['mapY'] - eventY, 2)) < self._buttonDist:
                        if self._select != node:
                            return node

        elif self._mode == Mode.lights:
            for light in self.activeMap._trafficLights:
                lightX, lightY = light.getPosition()
                if math.sqrt(pow(lightX - eventX, 2) + pow(lightY - eventY, 2)) < self._buttonDist:
                    if self._select != light:
                        return light

        elif self._mode == Mode.chargers:
            for charger in self.activeMap._chargingStations:
                chargerX, chargerY = charger.getPosition()
                if math.sqrt(pow(chargerX - eventX, 2) + pow(chargerY - eventY, 2)) < self._buttonDist:
                    if self._select != charger:
                        return charger
            if self._select is not None:
                for node in self.activeGraph.getNodes():
                    if math.sqrt(pow(node['mapX'] - eventX, 2) + pow(node['mapY'] - eventY, 2)) < self._buttonDist:
                        if self._select != node:
                            return node

        else:
            for node in self.activeGraph.getNodes():
                if math.sqrt(pow(node['mapX'] - eventX, 2) + pow(node['mapY'] - eventY, 2)) < self._buttonDist:
                    if self._select != node:
                        return node
                    else:
                        sameNodeSelected = True
            if sameNodeSelected:
                return self._select

            for edge in self.activeGraph.getEdges():
                startNode, endNode = self.activeGraph.getEdgeNodes(edge)
                if VectorOperations.pnt2line((eventX, eventY), (startNode['mapX'], startNode['mapY']),
                                             (endNode['mapX'], endNode['mapY'])) < self._buttonDist * 2:
                    if self._select != edge:
                        return edge

    def getObjectRelatives(self, selectedObject):
        relatives = []
        self._neighborhoodNodes = list()
        self._neighborhoodEdgeInfo = list()
        if self.activeGraph.isNode(selectedObject):
            if self._mode == Mode.normal:
                if self.activeGraph.isNodeType(selectedObject, 'entryLocation') and 'gates' in selectedObject['entryLocation']:
                    for gate in selectedObject['entryLocation']['gates']:
                        possibleNode = self.activeGraph.getNodeByGate(gate)
                        if possibleNode is not None:
                            relatives.append(possibleNode)
            elif self._mode == Mode.dependencies:
                if self.activeGraph.isNode(selectedObject):
                    dependencies = self.activeGraph.nodeDependencies(selectedObject)
                    if dependencies is not None:
                        for dependency in dependencies:
                            if dependency.navigationGraph == self.activeGraph:
                                dependantNode = self.activeGraph.getNodeById(dependency.nodeId)
                                if dependantNode is not None:
                                    relatives.append(dependantNode)
                    self._neighborhoodNodes, self._neighborhoodEdgeInfo = self.objectsInNeighborhood(selectedObject['mapX'], selectedObject['mapY'])
        elif self.activeMap.isStation(selectedObject):
            assignedNodeIds = selectedObject.getAssignedNodesOfGraph(self.activeGraph)
            for nodeId in assignedNodeIds:
                relatives.append(self.activeGraph.getNodeById(nodeId))
        elif self.activeMap.isChargingStation(selectedObject):
            assignedNodeIds = selectedObject.getAssignedNodesOfGraph(self.activeGraph)
            for nodeId in assignedNodeIds:
                relatives.append(self.activeGraph.getNodeById(nodeId))
        return relatives

    def objectsInNeighborhood(self, positionX, positionY):
        neighborhoodNodes = list()
        neighborhoodEdgeInfo = list()
        if self._showGraphInLocalCoordinateSystem or not self._dependenciesInNeighborhood:
            return neighborhoodNodes, neighborhoodEdgeInfo
        radius = 150.0
        for graph in self.activeMap.getNavigationGraphList():
            if graph == self.activeGraph:
                continue
            neighborhoodNodeIdsGraph = list()
            for node in graph.getNodes():
                if math.sqrt(pow(node['mapX'] - positionX, 2) + pow(node['mapY'] - positionY, 2)) < radius:
                    neighborhoodNodes.append((graph, node))
                    neighborhoodNodeIdsGraph.append(node['id'])
            for edge in graph.getEdges():
                if edge['startNodeId'] in neighborhoodNodeIdsGraph or edge['endNodeId'] in neighborhoodNodeIdsGraph:
                    startNode = graph.getNodeById(edge['startNodeId'])
                    endNode = graph.getNodeById(edge['endNodeId'])
                    neighborhoodEdgeInfo.append([graph, startNode, endNode])
        return neighborhoodNodes, neighborhoodEdgeInfo

    def closeNeighbor(self, eventX, eventY):
        if not self._showGraphInLocalCoordinateSystem and self._dependenciesInNeighborhood:
            for entry in self._neighborhoodNodes:
                graph = entry[0]
                node = entry[1]
                if math.sqrt(pow(node['mapX'] - eventX, 2) + pow(node['mapY'] - eventY, 2)) < self._buttonDist:
                    return graph, node
        return None, None

    def inRangeNode(self, node, x, y):
        if self._showGraphInLocalCoordinateSystem:
            eventX, eventY = self.activeGraph.coordinateTransformation.transformCoordinates(x, y)
        else:
            eventX = x
            eventY = y
        if math.sqrt(pow(node['mapX'] - eventX, 2) + pow(node['mapY'] - eventY, 2)) < self._buttonDist:
            return True
        else:
            return False

    def rescale(self, unit, scale):
        if scale != 1.0 or self._unit != unit:
            unitFactor = 1
            if self._unit != unit:
                if unit == 'meter':
                    unitFactor = 1/1000
                elif unit == 'millimeter':
                    unitFactor = 1000

            for node in self.activeGraph.getNodes():
                node['x'] = node['x']*scale*unitFactor
                node['y'] = node['y']*scale*unitFactor

            for point in self._points:
                point['x'] = point['x']*scale*unitFactor
                point['y'] = point['y']*scale*unitFactor

            xlim_left, xlim_right, ylim_bottom, ylim_top = self.getMapLimits()

            self.sizeFactorMap(xlim_left*1.05, xlim_right*1.05, ylim_bottom*1.05, ylim_top*1.05)
            self.updateTicks(newScale=True)
            self.updateButtonDist()

    def transposeBackground(self, dX, dY):
        self.background.transpose(dX, dY)

    def zoomView(self, x, y, zoomFactor):
        newWidth = zoomFactor * abs(self._xlim_right - self._xlim_left)
        newHeight = zoomFactor * abs(self._ylim_top - self._ylim_bottom)
        self._xlim_left = x - newWidth / 2
        self._xlim_right = x + newWidth / 2
        self._ylim_bottom = y - newHeight / 2
        self._ylim_top = y + newHeight / 2
        self.updateTicks(newScale=True)
        self.updateButtonDist()

    def moveView(self, dx, dy):
        self._xlim_left += dx
        self._xlim_right += dx
        self._ylim_bottom += dy
        self._ylim_top += dy
        self.updateTicks(newScale=False)

    def getMapLimits(self):
        if self.activeGraph.getNodes():
            xlim_left = min([node['x' if self._showGraphInLocalCoordinateSystem else 'mapX'] for node in self.activeGraph.getNodes()])
            xlim_right = max([node['x' if self._showGraphInLocalCoordinateSystem else 'mapX'] for node in self.activeGraph.getNodes()])
            ylim_bottom = min([node['y' if self._showGraphInLocalCoordinateSystem else 'mapY'] for node in self.activeGraph.getNodes()])
            ylim_top = max([node['y' if self._showGraphInLocalCoordinateSystem else 'mapY'] for node in self.activeGraph.getNodes()])

            if xlim_left == xlim_right:
                if xlim_left < 0:
                    xlim_right = 0
                elif xlim_left > 0:
                    xlim_left = 0
                elif xlim_left == 0:
                    xlim_right = 1

            if ylim_bottom == ylim_top:
                if ylim_bottom < 0:
                    ylim_top = 0
                elif ylim_bottom > 0:
                    ylim_top = 0
                elif ylim_bottom == 0:
                    ylim_top = 1

            if xlim_left > 0:
                xlim_left = 0
            if ylim_bottom > 0:
                ylim_bottom = 0
            return xlim_left, xlim_right, ylim_bottom, ylim_top
        else:
            return self._xlim_left, self._xlim_right, self._ylim_bottom, self._ylim_top

    def sizeFactorMap(self, size_x_left, size_x_right, size_y_bottom, size_y_top):
        sizeFactor = abs(size_x_right-size_x_left)/abs(size_y_top-size_y_bottom)
        sizeFactor = round(sizeFactor, 2)
        if sizeFactor <= 1.0:
            sizeFactor = 1.5
            size_x_right = size_x_left + (size_y_top - size_y_bottom) * sizeFactor
        elif sizeFactor > 1.0:
            if sizeFactor < 1.5:
                sizeFactor = 1.5
                size_x_right += (size_y_top - size_y_bottom) * sizeFactor - (size_x_right-size_x_left)
            else:
                sizeFactor = 1.5
                size_y_top += (size_x_right-size_x_left) / sizeFactor - (size_y_top - size_y_bottom)
        self._xlim_left = size_x_left
        self._xlim_right = size_x_right
        self._ylim_bottom = size_y_bottom
        self._ylim_top = size_y_top

    def getViewSize(self):
        return self._xlim_right - self._xlim_left, self._ylim_top - self._ylim_bottom

    def updateDrawingLimits(self, forceUpdate=False):
        if not self._activeGraph.getNodes():
            return
        xlim_left, xlim_right, ylim_bottom, ylim_top = self.getMapLimits()
        xlim_left = xlim_left * 1.05
        xlim_right = xlim_right * 1.05
        ylim_bottom = ylim_bottom * 1.05
        ylim_top = ylim_top * 1.05

        if xlim_left < self._xlim_left or xlim_right > self._xlim_right or ylim_bottom < self._ylim_bottom or ylim_top > self._ylim_top or forceUpdate:
            self.sizeFactorMap(xlim_left, xlim_right, ylim_bottom, ylim_top)
            self.updateButtonDist()
            self.updateTicks(newScale=True)
            return
        else:
            return

    def updateTicks(self, newScale=False):
        if newScale:
            dx = self._xlim_right - self._xlim_left
            digits = int(math.log10(dx)) + 1
            if dx < 10**digits * 0.25:
                self._majorTickStep = 10 ** (digits-2)
            elif dx < 10**digits * 0.5:
                self._majorTickStep = 10 ** (digits-2) * 2.5
            elif dx < 10**digits * 0.75:
                self._majorTickStep = 10 ** (digits-2) * 5
            else:
                self._majorTickStep = 10 ** (digits - 2) * 10

            self._minorTickStep = self._majorTickStep / 4

            self._majorTicksX = [tick for tick in np.arange(int(self._xlim_left) - self._majorTickStep,
                                                            int(self._xlim_right) + 2 * self._majorTickStep,
                                                            self._majorTickStep)]
            self._majorTicksY = [tick for tick in np.arange(int(self._ylim_bottom) - self._majorTickStep,
                                                            int(self._ylim_top) + 2 * self._majorTickStep,
                                                            self._majorTickStep)]
            self._minorTicksX = [tick for tick in np.arange(self._majorTicksX[0], self._majorTicksX[-1],
                                                            self._minorTickStep)]
            self._minorTicksY = [tick for tick in np.arange(self._majorTicksY[0], self._majorTicksY[-1],
                                                            self._minorTickStep)]
            self.tick_update = True
        else:
            self.tick_update = False
            dx_l = int((self._xlim_left - self._majorTicksX[1]) / self._majorTickStep)
            dx_r = int((self._xlim_right - self._majorTicksX[-2]) / self._majorTickStep)
            dy_b = int((self._ylim_bottom - self._majorTicksY[1]) / self._majorTickStep)
            dy_t = int((self._ylim_top - self._majorTicksY[-2]) / self._majorTickStep)

            if dx_l < 0:
                newTicks = [tick for tick in np.arange(self._majorTicksX[0] + dx_l * self._majorTickStep,
                                                       self._majorTicksX[0],
                                                       self._majorTickStep)]
                self._majorTicksX = newTicks + self._majorTicksX
                self._minorTicksX = [tick for tick in np.arange(self._majorTicksX[0],
                                                                self._majorTicksX[-1],
                                                                self._minorTickStep)]
                if dx_r < 0:
                    self._majorTicksX = self._majorTicksX[:dx_r]
                self.tick_update = True

            if dx_r > 0:
                newTicks = [tick for tick in np.arange(self._majorTicksX[-1] + self._majorTickStep,
                                                       self._majorTicksX[-1] + (dx_r + 1) * self._majorTickStep,
                                                       self._majorTickStep)]
                self._majorTicksX = self._majorTicksX + newTicks
                self._minorTicksX = [tick for tick in np.arange(self._majorTicksX[0],
                                                                self._majorTicksX[-1],
                                                                self._minorTickStep)]
                if dx_l > 0:
                    self._majorTicksX = self._majorTicksX[dx_l:]
                self.tick_update = True

            if dy_b < 0:
                newTicks = [tick for tick in np.arange(self._majorTicksY[0] + dy_b * self._majorTickStep,
                                                       self._majorTicksY[0],
                                                       self._majorTickStep)]
                self._majorTicksY = newTicks + self._majorTicksY
                self._minorTicksY = [tick for tick in np.arange(self._majorTicksY[0],
                                                                self._majorTicksY[-1],
                                                                self._minorTickStep)]
                if dy_t < 0:
                    self._majorTicksY = self._majorTicksY[:(dy_t)]
                self.tick_update = True

            if dy_t > 0:
                newTicks = [tick for tick in np.arange(self._majorTicksY[-1] + self._majorTickStep,
                                                       self._majorTicksY[-1] + (dy_t + 1) * self._majorTickStep,
                                                       self._majorTickStep)]
                self._majorTicksY = self._majorTicksY + newTicks
                self._minorTicksY = [tick for tick in np.arange(self._majorTicksY[0],
                                                                self._majorTicksY[-1],
                                                                self._minorTickStep)]
                if dy_b > 0:
                    self._majorTicksY = self._majorTicksY[dy_b:]
                self.tick_update = True

    def drawTicks(self):
        self._ax.set_xticks(self._majorTicksX, minor=False)
        self._ax.set_yticks(self._majorTicksY, minor=False)
        self._ax.set_xticks(self._minorTicksX, minor=True)
        self._ax.set_yticks(self._minorTicksY, minor=True)
        self._ax.grid(visible=True, which='major', color='grey', linewidth=1.0)
        self._ax.grid(visible=True, which='minor', color='grey', linewidth=0.1)
        self.updatePixelTickRatio()
        self.tick_update = False

    def clearMap(self):
        if self._scatter is not None:
            self._scatter.remove()
            self._scatter = None
        if self._quiver is not None:
            self._quiver.remove()
            self._quiver = None
        if self._selected_quiver is not None:
            self._selected_quiver.remove()
            self._selected_quiver = None
        if self._ghostPlot is not None:
            self._ghostPlot.remove()
            self._ghostPlot = None
        if self._ghostQuiver is not None:
            self._ghostQuiver.remove()
            self._ghostQuiver = None
        if self._stationsScatter is not None:
            self._stationsScatter.remove()
            self._stationsScatter = None
        if self._lightScatter is not None:
            self._lightScatter.remove()
            self._lightScatter = None
        if self._chargingStationScatter is not None:
            self._chargingStationScatter.remove()
            self._chargingStationScatter = None
        if self._coordinateSystemDraw is not None:
            self._coordinateSystemDraw.remove()
            self._coordinateSystemDraw = None
        if self._trajectoryScatter is not None:
            self._trajectoryScatter.remove()
            self._trajectoryScatter = None
        if self._neighborhoodNodePlot is not None:
            self._neighborhoodNodePlot.remove()
            self._neighborhoodNodePlot = None
        if self._neighborhoodEdgesScatter is not None:
            self._neighborhoodEdgesScatter.remove()
            self._neighborhoodEdgesScatter = None
        [p.remove() for p in reversed(self._ax.patches)]

    def setMarkerTypes(self):
        markerFaceColor = []
        markerEdgeColor = []
        markerSize = []
        lineWidth = []
        for node in self._activeGraph.getNodes():
            markerEdgeColor.append(MapEditorDesign.ELEMENT_COLORS['nodeBorder'])
            if node == self._select:
                markerFaceColor.append(MapEditorDesign.ELEMENT_COLORS['selectedObject'])
                lineWidth.append(1)
                markerSize.append(1.5*self._nodeDiameter ** 2)
            elif self._activeGraph.nodeInChangedNodeLogs(node, move=False):
                markerFaceColor.append(MapEditorDesign.ELEMENT_COLORS['changed'])
                lineWidth.append(1)
                markerSize.append(self._nodeDiameter ** 2)
            elif self._activeGraph.nodeInChangedNodeLogs(node, move=True):
                markerFaceColor.append(MapEditorDesign.ELEMENT_COLORS['moved'])
                lineWidth.append(1)
                markerSize.append(self._nodeDiameter ** 2)
            elif 'emergencySpot' in node:
                markerFaceColor.append(MapEditorDesign.ELEMENT_COLORS['emergencySpot'])
                lineWidth.append(1)
                markerSize.append(self._nodeDiameter ** 2)
            elif 'parkingSpot' in node:
                markerFaceColor.append(MapEditorDesign.ELEMENT_COLORS['parkingSpot'])
                lineWidth.append(1)
                markerSize.append(self._nodeDiameter ** 2)
            else:
                markerFaceColor.append(MapEditorDesign.ELEMENT_COLORS['node'])
                lineWidth.append(1)
                markerSize.append(self._nodeDiameter ** 2)
            if self._selectRelatives:
                if node in self._selectRelatives:
                    markerEdgeColor[-1] = MapEditorDesign.ELEMENT_COLORS['selectedObject']
                    lineWidth[-1] = 3
            if self._pointingDependentNodes:
                if node in self._pointingDependentNodes:
                    markerFaceColor[-1] = MapEditorDesign.ELEMENT_COLORS['pointingObject']

        return markerFaceColor, markerEdgeColor, markerSize, lineWidth

    def drawMap(self):
        self.clearMap()

        if self.background is not None:
            if self.background._drawn is False and self.background.image is not None:
                self.background.showBackground(self._ax)
                self.tick_update = True

        # Update Ticks and Axis
        if self.tick_update:
            self.drawTicks()
        self._ax.set_xlim([self._xlim_left, self._xlim_right])
        self._ax.set_ylim([self._ylim_bottom, self._ylim_top])

        # Plot Graph Coordinate System
        if self._showLocalCoordinateSystem and not self._showGraphInLocalCoordinateSystem:
            self.drawGraphCoordinateSystem()

        # Plot Edges
        self.drawEdges()

        # Plot Nodes
        self.drawNodes()

        # Plot Periphery
        self.drawStations()
        self.drawTrafficLights()
        self.drawChargingStations()

        # Plot Environment
        for polygon in self._polygons:
            self._ax.add_patch(patches.Polygon(polygon['polygon'].getVertices(), fill=False, hatch='\\'))

        # Plot Trajectories
        if self.activeGraph.isEdge(self._select) and self._showTrajectories:
            edgeTrajectory = self.activeGraph._trajectories[self._select['id']]
            #for trajectory in self.activeGraph._trajectories.values():
            self._trajectoryScatter = self._ax.scatter([point[0] for point in edgeTrajectory.curvePoints],
                                                       [point[1] for point in edgeTrajectory.curvePoints],
                                                       marker='.', c=MapEditorDesign.ELEMENT_COLORS['trajectory'],
                                                       s=self._nodeDiameter**1)

        # Plot selected component
        self.drawSelected()

        # Plot draw neighborhoord
        self.drawNeighborhood()

        # Plot Drag
        self.drawDragGhost()

    def drawNodes(self):
        if self._showGraphInLocalCoordinateSystem:
            self._drawNodesInLocalCoordinateSystem()
        else:
            self._drawNodesInMapCoordinateSystem()

    def _drawNodesInLocalCoordinateSystem(self):
        markerFaceColor, markerEdgeColor, markerSize, lineWidth = self.setMarkerTypes()
        self._scatter = self._ax.scatter([node['x'] for node in self._activeGraph.getNodes()],
                                         [node['y'] for node in self._activeGraph.getNodes()],
                                         marker='o', facecolors=markerFaceColor, edgecolors=markerEdgeColor,
                                         s=markerSize, linewidth=lineWidth)

    def _drawNodesInMapCoordinateSystem(self):
        markerFaceColor, markerEdgeColor, markerSize, lineWidth = self.setMarkerTypes()
        self._scatter = self._ax.scatter([node['mapX'] for node in self._activeGraph.getNodes()],
                                         [node['mapY'] for node in self._activeGraph.getNodes()],
                                         marker='o', facecolors=markerFaceColor, edgecolors=markerEdgeColor,
                                         s=markerSize, linewidth=lineWidth)

    def drawEdges(self):
        if self._showGraphInLocalCoordinateSystem:
            self._drawEdgesInLocalCoordinateSystem()
        else:
            self._drawEdgesInMapCoordinateSystem()

    def _drawEdgesInLocalCoordinateSystem(self):
        X = [self.activeGraph._edgesCoordinates[edge['id']]['startNode']['x'] for edge in self.activeGraph.getEdges()]
        Y = [self.activeGraph._edgesCoordinates[edge['id']]['startNode']['y'] for edge in self.activeGraph.getEdges()]
        U = [self.activeGraph._edgesCoordinates[edge['id']]['endNode']['x'] -
             self.activeGraph._edgesCoordinates[edge['id']]['startNode']['x']
             for edge in self.activeGraph.getEdges()]
        V = [self.activeGraph._edgesCoordinates[edge['id']]['endNode']['y'] -
             self.activeGraph._edgesCoordinates[edge['id']]['startNode']['y']
             for edge in self.activeGraph.getEdges()]
        self._quiver = self._ax.quiver(X, Y, U, V, scale_units='xy', angles='xy', scale=1, units='dots',
                                       color=MapEditorDesign.ELEMENT_COLORS['edge'], width=3)

    def _drawEdgesInMapCoordinateSystem(self):
        X = [self.activeGraph._edgesCoordinates[edge['id']]['startNode']['mapX'] for edge in self.activeGraph.getEdges()]
        Y = [self.activeGraph._edgesCoordinates[edge['id']]['startNode']['mapY'] for edge in self.activeGraph.getEdges()]
        U = [self.activeGraph._edgesCoordinates[edge['id']]['endNode']['mapX'] -
             self.activeGraph._edgesCoordinates[edge['id']]['startNode']['mapX']
             for edge in self.activeGraph.getEdges()]
        V = [self.activeGraph._edgesCoordinates[edge['id']]['endNode']['mapY'] -
             self.activeGraph._edgesCoordinates[edge['id']]['startNode']['mapY']
             for edge in self.activeGraph.getEdges()]
        self._quiver = self._ax.quiver(X, Y, U, V, scale_units='xy', angles='xy', scale=1, units='dots',
                                       color=MapEditorDesign.ELEMENT_COLORS['edge'], width=3)

    def drawStations(self):
        if self._showGraphInLocalCoordinateSystem:
            self._drawStationsInLocalCoordinateSystem()
        else:
            self._drawStationsInMapCoordinateSystem()

    def _drawStationsInMapCoordinateSystem(self):
        stationPositions = [station.getPosition() for station in self.activeMap._stations]
        faceColors, borderColors = self.stationColors()
        zoomFactor = 11 / (self._xlim_right - self._xlim_left)
        self._stationsScatter = self._ax.scatter([position[0] for position in stationPositions],
                                                 [position[1] for position in stationPositions],
                                                 marker='s', facecolors=faceColors, edgecolors=borderColors,
                                                 s=zoomFactor * 20 * self._nodeDiameter ** 2)

    def _drawStationsInLocalCoordinateSystem(self):
        stationPositions = list()
        for station in self.activeMap._stations:
            positionX, positionY = station.getPosition()
            localX, localY = self.activeGraph.coordinateTransformation.reverseTransformCoordinates(positionX, positionY)
            stationPositions.append([localX, localY])
        faceColors, borderColors = self.stationColors()
        zoomFactor = 11 / (self._xlim_right - self._xlim_left)
        self._stationsScatter = self._ax.scatter([position[0] for position in stationPositions],
                                                 [position[1] for position in stationPositions],
                                                 marker='s', facecolors=faceColors, edgecolors=borderColors,
                                                 s=zoomFactor * 20 * self._nodeDiameter ** 2)

    def drawTrafficLights(self):
        trafficLightPositions = [light.getPosition() for light in self.activeMap._trafficLights]
        faceColors, borderColors = self.trafficLightsColors()
        self._lightScatter = self._ax.scatter([position[0] for position in trafficLightPositions],
                                              [position[1] for position in trafficLightPositions],
                                              marker='D', facecolors=faceColors, edgecolors=borderColors,
                                              s= 3 * self._nodeDiameter ** 2)

    def drawChargingStations(self):
        if self._showGraphInLocalCoordinateSystem:
            self._drawChargingStationsInLocalCoordinateSystem()
        else:
            self._drawChargingStationsInMapCoordinateSystem()

    def _drawChargingStationsInMapCoordinateSystem(self):
        chargerPositions = [charger.getPosition() for charger in self.activeMap._chargingStations]
        faceColors, borderColors = self.chargingStationColors()
        zoomFactor = 400 / (self._xlim_right - self._xlim_left)
        self._chargingStationScatter = self._ax.scatter([position[0] for position in chargerPositions],
                                              [position[1] for position in chargerPositions],
                                              marker='h', facecolors=faceColors, edgecolors=borderColors,
                                              s=zoomFactor * self._nodeDiameter ** 2)

    def _drawChargingStationsInLocalCoordinateSystem(self):
        stationPositions = list()
        for station in self.activeMap._chargingStations:
            positionX, positionY = station.getPosition()
            localX, localY = self.activeGraph.coordinateTransformation.transformCoordinates(positionX, positionY)
            stationPositions.append([localX, localY])
        faceColors, borderColors = self.chargingStationColors()
        zoomFactor = 11 / (self._xlim_right - self._xlim_left)
        self._chargingStationScatter = self._ax.scatter([position[0] for position in stationPositions],
                                                 [position[1] for position in stationPositions],
                                                 marker='s', facecolors=faceColors, edgecolors=borderColors,
                                                 s=zoomFactor * 20 * self._nodeDiameter ** 2)

    def stationColors(self):
        faceColors = []
        borderColors = []
        for station in self.activeMap._stations:
            borderColors.append(MapEditorDesign.ELEMENT_COLORS['handlingStationBorder'])
            if self._select == station:
                faceColors.append(MapEditorDesign.ELEMENT_COLORS['selectedObject'])
            else:
                faceColors.append(MapEditorDesign.ELEMENT_COLORS['handlingStation'])
        return faceColors, borderColors

    def trafficLightsColors(self):
        faceColors = []
        borderColors = []
        for light in self.activeMap._trafficLights:
            borderColors.append(MapEditorDesign.ELEMENT_COLORS['trafficLightBorder'])
            if self._select == light:
                faceColors.append(MapEditorDesign.ELEMENT_COLORS['selectedObject'])
            else:
                faceColors.append(MapEditorDesign.ELEMENT_COLORS['trafficLight'])
        return faceColors, borderColors

    def chargingStationColors(self):
        faceColors = []
        borderColors = []
        for charger in self.activeMap._chargingStations:
            borderColors.append(MapEditorDesign.ELEMENT_COLORS['chargingStationBorder'])
            if self._select == charger:
                faceColors.append(MapEditorDesign.ELEMENT_COLORS['selectedObject'])
            else:
                faceColors.append(MapEditorDesign.ELEMENT_COLORS['chargingStation'])
        return faceColors, borderColors

    def drawGraphCoordinateSystem(self):
        if not self.activeGraph.coordinateTransformation.transformationIsNull():
            x0, y0 = self.activeGraph.coordinateTransformation.transformCoordinates(0, 0)
            x1, y1 = self.activeGraph.coordinateTransformation.transformCoordinates(1, 0)
            x2, y2 = self.activeGraph.coordinateTransformation.transformCoordinates(0, 1)

            X = [x0, x0]
            Y = [y0, y0]
            U = [x1-x0, x2-x0]
            V = [y1-y0, y2-y0]
            self._coordinateSystemDraw = self._ax.quiver(X, Y, U, V, scale_units='inches', angles='xy', scale=2.0,
                                                         units='dots', color='red', width=3)
        else:
            X = [0, 0]
            Y = [0, 0]
            U = [1, 0]
            V = [0, 1]
            self._coordinateSystemDraw = self._ax.quiver(X, Y, U, V, scale_units='inches', angles='xy', scale=2.0,
                                                         units='dots', color='red', width=3)

    def drawSelected(self):
        if self._showGraphInLocalCoordinateSystem:
            self._drawSelectedInLocalCoordinateSystem()
        else:
            self._drawSelectedInMapCoordinateSystem()

    def _drawSelectedInMapCoordinateSystem(self):
        if self._select is not None:
            if self._mode != Mode.environment:
                if self.activeGraph.isEdge(self._select):
                    startNode, endNode = self._activeGraph.getEdgeNodes(self._select)
                    self._selected_quiver = self._ax.quiver(startNode['mapX'], startNode['mapY'],
                                                            endNode['mapX'] - startNode['mapX'],
                                                            endNode['mapY'] - startNode['mapY'], scale_units='xy',
                                                            angles='xy', scale=1, units='dots', width=3, color='gold')

    def _drawSelectedInLocalCoordinateSystem(self):
        if self._select is not None:
            if self._mode != Mode.environment:
                if self.activeGraph.isEdge(self._select):
                    startNode, endNode = self._activeGraph.getEdgeNodes(self._select)
                    self._selected_quiver = self._ax.quiver(startNode['x'], startNode['y'],
                                                            endNode['x'] - startNode['x'],
                                                            endNode['y'] - startNode['y'], scale_units='xy',
                                                            angles='xy', scale=1, units='dots', width=3, color='gold')

    def drawSelectedEnvironment(self): #ToDo: Put back to use
        if self._mode == Mode.environment:
            if self._polygonMode and self._selectedPoints != []:
                for point in self._selectedPoints:
                    self._ax.plot(point['x'], point['y'], 'go', ms=self._pointDiameter)
            elif not self._polygonMode:
                if self._select is not None and 'polygon' in self._select:
                    self._ax.add_patch(
                        patches.Polygon(self._select['polygon'].getVertices(), edgecolor='y', fill=False, hatch='\\'))

    def drawDragGhost(self):
        if self._showGraphInLocalCoordinateSystem:
            self._drawDragGhostInLocalCoordinateSystem()
        else:
            self._drawDragGhostInMapCoordinateSystem()

    def _drawDragGhostInMapCoordinateSystem(self):
        if self._ghost:
            self._ghostPlot = self._ax.scatter(self._ghost[0], self._ghost[1], marker='o', c=['red'], alpha=0.5,
                                               s=self._nodeDiameter**2)
            if self._ghostConnections:
                X = [self._ghost[0] for connection in self._ghostConnections]
                Y = [self._ghost[1] for connection in self._ghostConnections]
                U = [connection['mapX'] - self._ghost[0] for connection in self._ghostConnections]
                V = [connection['mapY'] - self._ghost[1] for connection in self._ghostConnections]
                self._ghostQuiver = self._ax.quiver(X, Y, U, V, scale_units='xy',
                                                    angles='xy', scale=1, units='dots', headlength=0, headwidth=0,
                                                    width=3, color='red', alpha=0.5)
        else:
            return

    def _drawDragGhostInLocalCoordinateSystem(self):
        if self._ghost:
            self._ghostPlot = self._ax.scatter(self._ghost[0], self._ghost[1], marker='o', c=['red'], alpha=0.5,
                                               s=self._nodeDiameter**2)
            if self._ghostConnections:
                X = [self._ghost[0] for connection in self._ghostConnections]
                Y = [self._ghost[1] for connection in self._ghostConnections]
                U = [connection['x'] - self._ghost[0] for connection in self._ghostConnections]
                V = [connection['y'] - self._ghost[1] for connection in self._ghostConnections]
                self._ghostQuiver = self._ax.quiver(X, Y, U, V, scale_units='xy',
                                                    angles='xy', scale=1, units='dots', headlength=0, headwidth=0,
                                                    width=3, color='red', alpha=0.5)
        else:
            return

    def drawNeighborhood(self):
        if self._showGraphInLocalCoordinateSystem:
            self._drawNeighborhoodInLocalCoordinateSystem()
        else:
            self._drawNeighborhoodInMapCoordinateSystem()

    def _drawNeighborhoodInLocalCoordinateSystem(self):
        X = [edgeInfo[1]['x'] for edgeInfo in self._neighborhoodEdgeInfo]
        Y = [edgeInfo[1]['y'] for edgeInfo in self._neighborhoodEdgeInfo]
        U = [edgeInfo[2]['x'] - edgeInfo[1]['x'] for edgeInfo in self._neighborhoodEdgeInfo]
        V = [edgeInfo[2]['y'] - edgeInfo[1]['y'] for edgeInfo in self._neighborhoodEdgeInfo]
        self._neighborhoodEdgesScatter = self._ax.quiver(X, Y, U, V, scale_units='xy', angles='xy', scale=1,
                                                         units='dots',
                                                         color=MapEditorDesign.ELEMENT_COLORS['neighbor'], width=3)

        markerFaceColor, markerEdgeColor, markerSize, lineWidth = self.setNeighborhoodMarkerTypes()
        self._neighborhoodNodePlot = self._ax.scatter([entry[1]['x'] for entry in self._neighborhoodNodes],
                                                      [entry[1]['y'] for entry in self._neighborhoodNodes],
                                                      marker='o', facecolors=markerFaceColor,
                                                      edgecolors=markerEdgeColor, s=markerSize, linewidth=lineWidth)

    def _drawNeighborhoodInMapCoordinateSystem(self):
        X = [edgeInfo[1]['mapX'] for edgeInfo in self._neighborhoodEdgeInfo]
        Y = [edgeInfo[1]['mapY'] for edgeInfo in self._neighborhoodEdgeInfo]
        U = [edgeInfo[2]['mapX'] - edgeInfo[1]['mapX'] for edgeInfo in self._neighborhoodEdgeInfo]
        V = [edgeInfo[2]['mapY'] - edgeInfo[1]['mapY'] for edgeInfo in self._neighborhoodEdgeInfo]
        self._neighborhoodEdgesScatter = self._ax.quiver(X, Y, U, V, scale_units='xy', angles='xy', scale=1, units='dots',
                                       color=MapEditorDesign.ELEMENT_COLORS['neighbor'], width=3)

        markerFaceColor, markerEdgeColor, markerSize, lineWidth = self.setNeighborhoodMarkerTypes()
        self._neighborhoodNodePlot = self._ax.scatter([entry[1]['mapX'] for entry in self._neighborhoodNodes],
                                                      [entry[1]['mapY'] for entry in self._neighborhoodNodes],
                                                      marker='o', facecolors=markerFaceColor,
                                                      edgecolors=markerEdgeColor, s=markerSize, linewidth=lineWidth)

    def setNeighborhoodMarkerTypes(self):
        markerFaceColor = []
        markerEdgeColor = []
        markerSize = []
        lineWidth = []
        for entry in self._neighborhoodNodes:
            possibleDependency = MapComponents.Dependency(nodeId=entry[1]['id'], navGraph=entry[0])
            possiblePointingDependency = MapComponents.Dependency(nodeId=self._select['id'], navGraph=self.activeGraph)
            markerFaceColor.append(MapEditorDesign.ELEMENT_COLORS['neighbor'])
            lineWidth.append(1)
            markerSize.append(self._nodeDiameter ** 2)
            markerEdgeColor.append(MapEditorDesign.ELEMENT_COLORS['nodeBorder'])
            if 'dependentNodeIds' in entry[1] and possiblePointingDependency in entry[1]['dependentNodeIds']:
                markerFaceColor[-1] = MapEditorDesign.ELEMENT_COLORS['pointingObject']
            if 'dependentNodeIds' in self._select and possibleDependency in self._select['dependentNodeIds']:
                markerEdgeColor[-1] = MapEditorDesign.ELEMENT_COLORS['selectedObject']
                lineWidth[-1] = 3
        return markerFaceColor, markerEdgeColor, markerSize, lineWidth

    @staticmethod
    def getFileName(name):
        fileName = os.path.basename(name)
        filePath = os.path.dirname(name)
        if filePath is None:
            filePath = os.getcwd()
        fileName = os.path.splitext(fileName)[0]
        return fileName, filePath
    
    def saveMap(self, name='outputMap', parkingSpotAsBoolean=False): #ToDo Rework
        fileName, filePath = self.getFileName(name)
        MapGeneratorJson.JsonMapWriter(self.activeMap, filePath, fileName, self._user, parkingSpotAsBoolean=parkingSpotAsBoolean)

    def loadMap(self, name):
        self.deleteAll()						   
        fileName, filePath = self.getFileName(name)
        #self._activeGraph._nodes, self._edges, groupAndStationDict, lightsList = MapGeneratorJson.JsonMapReader(filePath, fileName)
        importedMap = MapGeneratorJson.JsonMapReader(filePath, fileName)
        if importedMap is None:
            print('There was no map to open!')
            return
        else:
            self.activeMap = importedMap
        self.activeGraph = self.activeMap.navigationGraphs[0]

    def mergeMap(self, name):
        fileName, filePath = self.getFileName(name)
        mergingMap = MapGeneratorJson.JsonMapReader(filePath, fileName)
        if mergingMap is None:
            print('There was no map to open!')
            return
        for graph in mergingMap.navigationGraphs:
            self.activeMap.addNavigationGraph(graph)
        # TODO: Merging of Groups, Stations and traffic Lights

    def importMap(self, name, vendor, mergeGraphs=False, mergeIntoExistingGraph=False):
        importedMap = MapGeneratorConverter.importExternalMap(name, vendor)
        changes = list()
        if importedMap is not None:
            if mergeGraphs and not mergeIntoExistingGraph:
                for graph in importedMap.navigationGraphs:
                    addedGraph = self.activeMap.addNavigationGraph(graph)
                    self.activeGraph = addedGraph
                    # TODO: Merging of Groups, Stations and traffic Lights in a suitable way
                    self.activeMap._stations += importedMap._stations
                    self.activeMap._groups += importedMap.getHandlingStationGroups()
            elif mergeIntoExistingGraph:
                changes = self.activeGraph.compare(importedMap.navigationGraphs[0])
            else:
                self.activeMap = importedMap
                self.activeGraph.updateEdgeCoordinates()
                self.updateDrawingLimits()
                self.updateButtonDist()
        return changes

    def saveEnvironment(self, name='Environment'):
        fileName, filePath = self.getFileName(name)
        MapGeneratorSVG.SVGWriter(self._polygons, filePath, fileName)


def main():
    MapGeneratorEditor()


if __name__ == "__main__":
    main()

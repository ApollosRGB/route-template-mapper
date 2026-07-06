# -*- coding: utf-8 -*-
"""
Created on Mon Sep  2 09:14:56 2019

@author: DanielKampen
"""
#import Corner
import Graph
import VectorOperations as vec
import sys
import math
import numpy as np
import matplotlib.pyplot as plt
import matplotlib
import matplotlib.patches as patches
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from scipy.spatial import Voronoi, voronoi_plot_2d
#from scipy.spatial import ConvexHull, convex_hull_plot_2d
#from scipy.spatial.distance import cdist
from shapely.geometry import LineString

matplotlib.use('TkAgg')


def intersect(segment1_v1, segment1_v2, segment2_v1, segment2_v2):
    line1 = LineString([segment1_v1, segment1_v2])
    line2 = LineString([segment2_v1, segment2_v2])
    if line1.intersection(line2):
        return True
    else:
        return False


def calculateDistance(x1, y1, x2, y2):
    dist = math.sqrt((x2 - x1)**2 + (y2 - y1)**2)
    return dist


def pointToSegmentDistance(pnt, start, end):
    line_vec = vec.vector(start, end)
    pnt_vec = vec.vector(start, pnt)
    line_len = vec.length(line_vec)
    line_unitvec = vec.unit(line_vec)
    pnt_vec_scaled = vec.scale(pnt_vec, 1.0/line_len)
    t = vec.dot(line_unitvec, pnt_vec_scaled)
    if t < 0.0:
        t = 0.0
    elif t > 1.0:
        t = 1.0
    nearest = vec.scale(line_vec, t)
    dist = vec.distance(nearest, pnt_vec)
    nearest = vec.add(nearest, start)
    return dist


def segmentsDistanceAverage(seg1_start, seg1_end, seg2_start, seg2_end):
    """ distance between two segments in the plane:
        one segment is (x11, y11) to (x12, y12)
        the other is   (x21, y21) to (x22, y22)
    """
    # try each of the 4 vertices w/the other segment
    distances = [pointToSegmentDistance(seg1_start, seg2_start, seg2_end),
                 pointToSegmentDistance(seg1_end, seg2_start, seg2_end),
                 pointToSegmentDistance(seg2_start, seg1_start, seg1_end),
                 pointToSegmentDistance(seg2_end, seg1_start, seg1_end)]
    return sum(distances)/4


class MapMedialAxis:

    def __init__(self, outerPolygon=None, innerPolygons=[], points=[]):
        self._outerPolygon = outerPolygon
        self._innerPolygons = innerPolygons
        self._points = points
        self._nodes = []
        self._paths = []
        self._voronoiVertices = []
        self._voronoiVerticesInMap = []
        self._intersectionsborders = {}
        self._intersectionVertices = []
        self._intersectionPoints = {}
        self._cornerVertices = []
        self._borderAssociatedMapNodes = {}
        self._allowedDeviation = 2

    def createVoronoi(self):
        voronoiPoints = []
        for point in self._points:
            voronoiPoints.append([point['x'], point['y']])
        self._voronoi = Voronoi(voronoiPoints)
        #fig = voronoi_plot_2d(self._voronoi, line_width = 0)
       # plt.axis('equal')
        #plt.show()
        #fig.savefig("voronoi.pdf", bbox_inches='tight')

    def voronoiToGraph(self):
        graph = Graph.Graph()
        print(self._voronoi.ridge_vertices)
        for ridgeId in range(0, len(self._voronoi.ridge_vertices)):
            if self._voronoi.ridge_vertices[ridgeId][0] != -1 and self._voronoi.ridge_vertices[ridgeId][1] != -1:
                if self._voronoiVerticesInMap[self._voronoi.ridge_vertices[ridgeId][0]] and self._voronoiVerticesInMap[self._voronoi.ridge_vertices[ridgeId][1]]:
                    graph.add_vertex(self._voronoi.ridge_vertices[ridgeId][0])
                    graph.add_vertex(self._voronoi.ridge_vertices[ridgeId][1])
                    graph.add_edge(self._voronoi.ridge_vertices[ridgeId])
                    graph.add_edge((self._voronoi.ridge_vertices[ridgeId][1], self._voronoi.ridge_vertices[ridgeId][0])) #Graph ist noch bidirektional

        return graph

    def voronoiInPolygons(self): #TODO: Bei sehr spitz zulaufend Umgebungen, entstehen Pfade, die durch die Umgebung laufen
        self._voronoiVerticesInMap = [True]*len(self._voronoi.vertices)
        voronoiPointsInOuterPolygon = self._outerPolygon['polygon'].insidePolygon(self._voronoi.vertices)

#        for pointId in range(0, len(self._voronoiVerticesInMap)):
#            if not voronoiPointsInOuterPolygon[pointId]:
#                self._voronoiVerticesInMap[pointId] = False
        for vertex in self._voronoiVerticesInMap:
            vertexId = self._voronoiVerticesInMap.index(vertex)
            if not voronoiPointsInOuterPolygon[vertexId]:
                vertex = False

        for polygon in self._innerPolygons:
            voronoiPointsInPolygon = polygon['polygon'].insidePolygon(self._voronoi.vertices)
            for pointId in range(0, len(voronoiPointsInPolygon)):
                if voronoiPointsInPolygon[pointId]:
                    self._voronoiVerticesInMap[pointId] = False

        for vertexId in range(0, len(self._voronoi.vertices)):
            self._voronoiVertices.append(list(self._voronoi.vertices[vertexId]))

    def getIntersections(self):
        self._intersectionVertices = [False]*len(self._voronoi.vertices)
        intersectionCount = [0]*len(self._voronoi.vertices)

        for ridgeId in range(0, len(self._voronoi.ridge_vertices)):
            if self._voronoi.ridge_vertices[ridgeId][0] != -1 and self._voronoi.ridge_vertices[ridgeId][1] != -1:
                if self._voronoiVerticesInMap[self._voronoi.ridge_vertices[ridgeId][0]] and self._voronoiVerticesInMap[self._voronoi.ridge_vertices[ridgeId][1]]:
                    intersectionCount[self._voronoi.ridge_vertices[ridgeId][0]] += 1
                    intersectionCount[self._voronoi.ridge_vertices[ridgeId][1]] += 1

        for vertexId in range(0, len(self._intersectionVertices)):
            if intersectionCount[vertexId] >= 3:
                self._intersectionVertices[vertexId] = True

    def pathsBetweenIntersections(self):
        graph = self.voronoiToGraph()
        possiblePaths = []
        for vertexId in range(0, len(self._intersectionVertices)):
            if self._intersectionVertices[vertexId]:
                newPaths = graph.find_paths(vertexId)
                possiblePaths += newPaths
                if len(newPaths) == 2: #is a corner not an intersection because of dead end
                    self._cornerVertices[vertexId] = True

        # for vertexId in range(0, len(self._intersectionVertices)):
        #     if self._intersectionVertices[vertexId] == True:
        #         self._intersectionVertices[vertexId] = False

        for path in possiblePaths:
            numberOfIntersectionsOnPath = 0
            for vertexId in path:
                if self._intersectionVertices[vertexId]:
                    numberOfIntersectionsOnPath += 1
                if numberOfIntersectionsOnPath > 2:
                    break
            if numberOfIntersectionsOnPath == 2:
                if path not in self._paths and path[::-1] not in self._paths:  # keine doppelten Pfade
                    self._paths.append(path)
        return self._paths

    def pathDeviation(self, path):
        startVertex = path[0]
        endVertex = path[-1]
        deviations = [0]*len(path)
        for vertex in path:
            deviations[path.index(vertex)] = pointToSegmentDistance(self._voronoiVertices[vertex], self._voronoiVertices[startVertex], self._voronoiVertices[endVertex])
        meanDeviation = sum(deviations)/len(path)
        maxDeviation = max(deviations)
        return meanDeviation, maxDeviation, deviations

    def adaptPaths(self): #TODO Anpassung der Pfade erfolgt nach wie vor nicht erfolgreich! Nähe zur Umgebung berücksichtigen?
        self._cornerVertices = [False] * len(self._voronoi.vertices)
        pathCounter = 0
        while pathCounter < len(self._paths) and len(self._paths[pathCounter]) > 1:
            path = self._paths[pathCounter]
            lengthPath = calculateDistance(self._voronoiVertices[path[0]][0], self._voronoiVertices[path[0]][1], self._voronoiVertices[path[-1]][0], self._voronoiVertices[path[-1]][1])
            meanDeviation, maxDeviation, deviations = self.pathDeviation(path)
            if maxDeviation > self._allowedDeviation or meanDeviation >= 0.2 * lengthPath: #maxDeviation >= 1.5*meanDeviation:
                #maxDeviation = max(deviations)
                newPath1 = path[:deviations.index(maxDeviation)+1]
                newPath2 = path[deviations.index(maxDeviation):]
                if not self._intersectionVertices[path[deviations.index(maxDeviation)]]:
                    self._cornerVertices[path[deviations.index(maxDeviation)]] = True
                self._paths.append(newPath1)
                self._paths.append(newPath2)
                self._paths.remove(path)
                pathCounter = 0
            else:
                pathCounter += 1

    def pointsOfIntersections(self):
        for vertexId in range(0, len(self._voronoi.vertices)):
            if self._intersectionVertices[vertexId]:
                self._intersectionPoints[vertexId] = []
                for region in range(0, len(self._voronoi.regions)):
                    if self._voronoi.regions[region] != []:
                        if vertexId in self._voronoi.regions[region]:
                            self._intersectionPoints[vertexId].append(np.where(self._voronoi.point_region == region)[0][0]) # TODO: lokk after numpy.where() == scipy.where()


def main(obj):
    sys.setrecursionlimit(10**6)

    Map = MapMedialAxis(obj._outerPolygon, obj._polygons, obj._points)
    print('0%')
    Map.createVoronoi()
    print('15%')
    Map.voronoiInPolygons()
    print('30%')
    Map.getIntersections()
    print('40%')
    #Map.getCorners()
    print('50%')
    Map.pointsOfIntersections()
    print('60%')
    Map.pathsBetweenIntersections()
    print('70%')
    Map.adaptPaths()
    print('80%')

    fig, ax = plt.subplots(figsize = (10, 5))
    for polygon in Map._innerPolygons:
        ax.add_patch(patches.Polygon(polygon['polygon'].getVertices(), fill=False, hatch='\\'))

    print('MAP')
    # print(Map._intersectionVertices)
    # print(Map._cornerVertices)
    for vertex in Map._voronoiVertices:
        if Map._intersectionVertices[Map._voronoiVertices.index(vertex)]:
            plt.plot(vertex[0], vertex[1], 'ro', ms=3)
        if Map._cornerVertices[Map._voronoiVertices.index(vertex)]:
            plt.plot(vertex[0], vertex[1], 'go', ms=3)

    for path in Map._paths:
        plt.plot([Map._voronoiVertices[path[0]][0], Map._voronoiVertices[path[-1]][0]], [Map._voronoiVertices[path[0]][1], Map._voronoiVertices[path[-1]][1]], 'k-', linewidth=1)

    for intersectionKey in Map._intersectionPoints.keys():
        for pointId in Map._intersectionPoints[intersectionKey]:
            plt.plot(Map._points[pointId]['x'], Map._points[pointId]['y'], 'yo', ms=3)

    plt.show()

    return True


if __name__ == "__main__":
    main()
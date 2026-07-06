# -*- coding: utf-8 -*-
"""
Created on Wed Oct  9 15:20:23 2019

@author: DanielKampen
"""
import math
import numpy as np
import shapely.geometry as geometry
from matplotlib import path

class Polygon:
    
    def calculateDistance(self, x1,y1,x2,y2):
        dist = math.sqrt((x2 - x1)**2 + (y2 - y1)**2)
        return dist
    
    def __init__(self, vertices=[]):
        self._vertices = vertices
        self._borders = []
        for vertId in range(0,len(self._vertices)):
            if vertId == len(self._vertices)-1:
                self._borders.append([self._vertices[vertId], self._vertices[0]])
            else:
                self._borders.append([self._vertices[vertId], self._vertices[vertId+1]])
        
    def getVertices(self):
        return self._vertices
    
    def splitBorders(self, interval):
        newPoints = []
        for border in self._borders:
            number_new_nodes = math.ceil(self.calculateDistance(border[0][0],border[0][1],border[1][0],border[1][1])/interval) -1
            dx = (border[1][0] - border[0][0]) / (number_new_nodes+1)
            dy = (border[1][1] - border[0][1]) / (number_new_nodes+1)
            for point_counter in range(0, number_new_nodes):
                newPoints.append([border[0][0]+ (point_counter+1)*dx, border[0][1]+ (point_counter+1)*dy])
        return newPoints
    
    def insidePolygon(self, points):
#        point = geometry.Point(x,y)
#        poly = geometry.polygon.Polygon(self._vertices)
#        return poly.contains(point)
        
        p = path.Path(self._vertices)
        return p.contains_points(points)
    
    def intersectBorders(self, segment):
        return False

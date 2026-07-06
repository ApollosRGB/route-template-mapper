# -*- coding: utf-8 -*-
"""
Created on Thu Aug 22 12:59:27 2019

@author: DanielKampen
"""

import math


def vector(startCoordinates, endCoordinates):
    x_start, y_start = startCoordinates
    x_end, y_end = endCoordinates
    return (x_end - x_start, y_end - y_start)


def add(vec1, vec2):
    x1, y1 = vec1
    x2, y2 = vec2
    return (x1 + x2, y1 + y2)


def length(vec):
    x, y = vec
    return math.sqrt(x*x + y*y)


def dotProduct(vec1, vec2):
    x1, y1 = vec1
    x2, y2 = vec2
    return x1*x2 + y1*y2


def unitVector(vec):
    x, y = vec
    lenVec = length(vec)
    return (x / lenVec, y / lenVec)


def distance(p0, p1):
    return length(vector(p0, p1))


def scale(vec, scaleFactor):
    x, y = vec
    return (x * scaleFactor, y * scaleFactor)


def pnt2line(pnt, start, end):
    line_vec = vector(start, end)
    pnt_vec = vector(start, pnt)
    line_len = length(line_vec)
    line_unitVector = unitVector(line_vec)
    pnt_vec_scaled = scale(pnt_vec, 1.0/line_len)
    t = dotProduct(line_unitVector, pnt_vec_scaled)
    if t < 0.0:
        t = 0.0
    elif t > 1.0:
        t = 1.0
    nearest = scale(line_vec, t)
    dist = distance(nearest, pnt_vec)
    nearest = add(nearest, start)
    return dist
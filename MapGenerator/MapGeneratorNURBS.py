from geomdl import BSpline, NURBS, exchange, convert, knotvector


class Trajectory:
    def __init__(self, controlPoints, weights, kVector=list(), degree=None):
        self._curve = NURBS.Curve()
        self.curvePoints = list()
        if controlPoints and weights:
            self.updateSpline(controlPoints, weights, kVector, degree)

    def updateSpline(self, controlPoints, weights, newKnotvector, degree=None):
        if degree is None:
            if len(controlPoints) == 2:
                self._curve.degree = 1
            else:
                self._curve.degree = 3
        else:
            self._curve.degree = degree
        self._curve.ctrlpts = controlPoints
        self._curve.weights = weights
        if newKnotvector:
            self._curve.knotvector = newKnotvector
        else:
            self._curve.knotvector = knotvector.generate(self._curve.degree, self._curve.ctrlpts_size)
        #self._curve = convert.bspline_to_nurbs(self._curve)
        self.calculateCurvePoints()

    def calculateCurvePoints(self):
        self._curve.delta = 0.01
        self._curve.evaluate()
        self.curvePoints = self._curve.evalpts

    def getCurvePoints(self):
        return self.curvePoints

    def setControlPoints(self, controlPoints, weights):
        self.updateSpline(controlPoints, weights)

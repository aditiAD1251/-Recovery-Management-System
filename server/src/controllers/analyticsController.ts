import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analyticsService.js';
import { ReportService, generateCsvString } from '../services/reportService.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { DateRangeQuery, ReportType, ReportQueryParams } from '../types/analytics.js';

/**
 * @desc    Get executive/admin portfolio analytics & aggregations
 * @route   GET /api/v1/analytics/admin
 * @access  Private (ADMIN)
 */
export const getAdminAnalyticsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { startDate, endDate } = req.query as DateRangeQuery;
    const analytics = await AnalyticsService.getAdminAnalytics({
      startDate,
      endDate,
    });

    sendSuccess(res, 'Admin analytics retrieved successfully', analytics);
  } catch (error: any) {
    console.error('Error fetching admin analytics:', error);
    sendError(res, error.message || 'Failed to fetch admin analytics', 500);
  }
};

/**
 * @desc    Get supervisor territory & team workload analytics
 * @route   GET /api/v1/analytics/supervisor
 * @access  Private (SUPERVISOR, ADMIN)
 */
export const getSupervisorAnalyticsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user!;
    const { startDate, endDate } = req.query as DateRangeQuery;

    const analytics = await AnalyticsService.getSupervisorAnalytics(user.id, {
      startDate,
      endDate,
    });

    sendSuccess(res, 'Supervisor analytics retrieved successfully', analytics);
  } catch (error: any) {
    console.error('Error fetching supervisor analytics:', error);
    sendError(res, error.message || 'Failed to fetch supervisor analytics', error.statusCode || 500);
  }
};

/**
 * @desc    Get agent personal portfolio, attempts & PTP performance analytics
 * @route   GET /api/v1/analytics/agent
 * @access  Private (AGENT)
 */
export const getAgentAnalyticsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user!;
    const { startDate, endDate } = req.query as DateRangeQuery;

    const analytics = await AnalyticsService.getAgentAnalytics(user.id, {
      startDate,
      endDate,
    });

    sendSuccess(res, 'Agent analytics retrieved successfully', analytics);
  } catch (error: any) {
    console.error('Error fetching agent analytics:', error);
    sendError(res, error.message || 'Failed to fetch agent analytics', error.statusCode || 500);
  }
};

/**
 * @desc    Get legal recovery & litigation operations analytics
 * @route   GET /api/v1/analytics/legal
 * @access  Private (LEGAL_HEAD, ADMIN)
 */
export const getLegalAnalyticsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { startDate, endDate } = req.query as DateRangeQuery;

    const analytics = await AnalyticsService.getLegalAnalytics({
      startDate,
      endDate,
    });

    sendSuccess(res, 'Legal analytics retrieved successfully', analytics);
  } catch (error: any) {
    console.error('Error fetching legal analytics:', error);
    sendError(res, error.message || 'Failed to fetch legal analytics', 500);
  }
};

/**
 * @desc    Generate executive reports with on-screen data or downloadable CSV
 * @route   GET /api/v1/analytics/reports/:reportType
 * @access  Private (ADMIN, SUPERVISOR, LEGAL_HEAD)
 */
export const getReportController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user!;
    const { reportType } = req.params;
    const query = req.query as ReportQueryParams;

    const validReports: ReportType[] = [
      'portfolio-summary',
      'collection-performance',
      'agent-performance',
      'delinquency-dpd',
      'ptp-report',
      'settlement-report',
      'legal-recovery',
    ];

    if (!validReports.includes(reportType as ReportType)) {
      sendError(
        res,
        `Invalid report type: '${reportType}'. Valid types: ${validReports.join(', ')}`,
        400
      );
      return;
    }

    const reportData = await ReportService.generateReport(
      reportType as ReportType,
      query,
      user
    );

    // If CSV format requested, serialize and send as downloadable attachment
    if (query.format === 'csv') {
      const csvMatrix = reportData.rows.map((row) =>
        reportData.headers.map((header) => row[header] ?? '')
      );

      const csvContent = generateCsvString(reportData.headers, csvMatrix);
      const filename = `${reportType}-${new Date().toISOString().slice(0, 10)}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csvContent);
      return;
    }

    // Default: JSON response
    sendSuccess(res, `${reportData.title} generated successfully`, reportData);
  } catch (error: any) {
    console.error('Error generating report:', error);
    sendError(res, error.message || 'Failed to generate report', error.statusCode || 500);
  }
};

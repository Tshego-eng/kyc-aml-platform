import {
	RegulatoryReportStatus,
	RegulatoryReportType,
} from "@prisma/client";
import prisma from "../lib/prisma";

const regulatoryReportInclude = {
	amlCase: true,
	customer: true,
	submittedBy: {
		select: {
			id: true,
			name: true,
			email: true,
			role: true,
		},
	},
};

export const createRegulatoryReport = async (
	caseId: string,
	submittedById: string,
	reason: string,
	reportType: RegulatoryReportType = RegulatoryReportType.SUSPICIOUS_ACTIVITY
) => {
	if (!reason.trim()) {
		throw new Error("REPORT_REASON_REQUIRED");
	}

	const amlCase = await prisma.aMLCase.findUnique({
		where: { id: caseId },
	});

	if (!amlCase) {
		throw new Error("CASE_NOT_FOUND");
	}

	const submitter = await prisma.user.findUnique({
		where: { id: submittedById },
	});

	if (!submitter) {
		throw new Error("SUBMITTER_NOT_FOUND");
	}

	return prisma.regulatoryReport.create({
		data: {
			caseId,
			customerId: amlCase.customerId,
			submittedById,
			reportType,
			reason: reason.trim(),
		},
		include: regulatoryReportInclude,
	});
};

export const submitRegulatoryReport = async (
	reportId: string,
	referenceNumber?: string
) => {
	const report = await prisma.regulatoryReport.findUnique({
		where: { id: reportId },
	});

	if (!report) {
		throw new Error("REGULATORY_REPORT_NOT_FOUND");
	}

	if (report.status !== RegulatoryReportStatus.DRAFT) {
		throw new Error("INVALID_REGULATORY_REPORT_STATUS");
	}

	return prisma.regulatoryReport.update({
		where: { id: reportId },
		data: {
			status: RegulatoryReportStatus.SUBMITTED,
			submittedAt: new Date(),
			...(referenceNumber !== undefined && {
				referenceNumber: referenceNumber.trim(),
			}),
		},
		include: regulatoryReportInclude,
	});
};

export const acknowledgeRegulatoryReport = async (
	reportId: string
) => {
	const report = await prisma.regulatoryReport.findUnique({
		where: { id: reportId },
	});

	if (!report) {
		throw new Error("REGULATORY_REPORT_NOT_FOUND");
	}

	if (report.status !== RegulatoryReportStatus.SUBMITTED) {
		throw new Error("INVALID_REGULATORY_REPORT_STATUS");
	}

	const referenceNumber = `REG-${Date.now()}`;

	return prisma.regulatoryReport.update({
		where: { id: reportId },
		data: {
			status: RegulatoryReportStatus.ACKNOWLEDGED,
			referenceNumber,
			acknowledgedAt: new Date(),
		},
		include: regulatoryReportInclude,
	});
};

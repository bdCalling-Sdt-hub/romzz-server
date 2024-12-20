import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { FeedbackServices } from './feedback.service';
import getPathAfterUploads from '../../helpers/getPathAfterUploads';

const createFeedback = catchAsync(async (req, res) => {
  const user = req.user;

  const payload = {
    ...req?.body,
    userId : user?.userId,
    visibilityStatus : 'hide',
  }

  if (req?.file && req?.file?.path) {
    payload.image = getPathAfterUploads(req?.file?.path); // If image file exists, set it
  }

  const result = await FeedbackServices.createFeedbackToDB(payload);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Feedback created successfully!',
    data: result,
  });
});

const getAllFeedbacks = catchAsync(async (req, res) => {
  const result = await FeedbackServices.getAllFeedbacksFromDB(req?.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Feedbacks retrieved successfully!',
    data: result,
  });
});

const getVisibleFeedbacks = catchAsync(async (req, res) => {
  const result = await FeedbackServices.getVisibleFeedbacksFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Feedbacks retrieved successfully!',
    data: result,
  });
});

const getUserProfileFeedbacks = catchAsync(async (req, res) => {
  const result = await FeedbackServices.getUserProfileFeedbacksFromDB(
    req?.params?.userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User profile feedbacks retrived successfully!',
    data: result,
  });
});

const updateFeedbackVisibilityStatus = catchAsync(async (req, res) => {
  const result = await FeedbackServices.updateFeedbackVisibilityStatusToDB(
    req?.params?.id,
    req?.body,
  );

  // Determine the appropriate message based on the feedback status
  const statusMessage =
    req?.body?.visibilityStatus === 'show'
      ? 'Feedback is now visible to all users.'
      : 'Feedback has been hidden from users.';

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: statusMessage,
    data: result,
  });
});

export const FeedbackControllers = {
  createFeedback,
  getAllFeedbacks,
  getVisibleFeedbacks,
  updateFeedbackVisibilityStatus,
  getUserProfileFeedbacks,
};

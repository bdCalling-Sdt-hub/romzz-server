/* eslint-disable @typescript-eslint/no-explicit-any */
import Stripe from 'stripe';
import stripe from '../config/stripe';
import { User } from '../modules/User/user.model';
import { PricingPlan } from '../modules/PricingPlan/pricingPlan.model';
import { Subscription } from '../modules/Subscription/subscription.model';
import ApiError from '../errors/ApiError';
import httpStatus from 'http-status';
import { sendNotifications } from '../helpers/notificationHelper';

export const handleSubscriptionCreated = async (data: Stripe.Subscription) => {
  // Retrieve the subscription from Stripe
  const subscription = await stripe.subscriptions.retrieve(data.id);

  // Retrieve the customer associated with the subscription
  const customer = (await stripe.customers.retrieve(
    subscription.customer as string,
  )) as Stripe.Customer;

  // Extract the price ID from the subscription items
  const priceId = subscription.items.data[0]?.price?.id;

  // Retrieve the invoice to get the transaction ID and amount paid
  const invoice = await stripe.invoices.retrieve(
    subscription.latest_invoice as string,
  );

  const trxId = invoice?.payment_intent;
  const amountPaid = invoice?.total / 100;

  if (customer?.email) {
    // Find the user by email
    const existingUser = await User.findOne({ email: customer?.email });

    if (existingUser) {
      // Find the pricing plan by priceId
      const pricingPlan = await PricingPlan.findOne({ priceId });

      if (pricingPlan) {
        // Find the current active subscription
        const currentActiveSubscription:any = await Subscription.findOne({
          userId: existingUser._id,
          status: 'active',
        });

        if (currentActiveSubscription) {

          // Update the existing subscription with new package details
          currentActiveSubscription.packageId = pricingPlan._id;
          currentActiveSubscription.amountPaid = amountPaid;
          currentActiveSubscription.trxId = trxId;

          await currentActiveSubscription.save();

          if(existingUser._id){
            const notificationData= {
              message: 'A User update Subscription plan',
              url: `/subscribers?id=${existingUser._id}`,
              isSeen: false,
              isRead: false,
              type: "ADMIN"
            };
            await sendNotifications(notificationData);
          }

          return;
        } else{

          // Create a new subscription record
          const newSubscription = new Subscription({
            userId: existingUser._id,
            customerId: customer?.id,
            packageId: pricingPlan._id,
            status: 'active',
            amountPaid,
            trxId,
          });

          await newSubscription.save();
          // Update the user to reflect the active subscription
          await User.findByIdAndUpdate(
            existingUser._id,
            {
              isSubscribed: true,
              hasAccess: true,
            },
            { new: true },
          );

          if(existingUser._id){
            const notificationData= {
              message: 'A User Subscribe a plan',
              url: `/subscribers?id=${existingUser._id}`,
              isSeen: false,
              isRead: false,
              type: "ADMIN"
            };
            await sendNotifications(notificationData);
          }
        }
      } else {
        // Pricing plan not found
        throw new ApiError(
          httpStatus.NOT_FOUND,
          `Pricing plan with Price ID: ${priceId} not found!`,
        );
      }
    } else {
      // User not found
      throw new ApiError(
        httpStatus.NOT_FOUND,
        `User with Email: ${customer.email} not found!`,
      );
    }
  } else {
    // No email found for the customer
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'No email found for the customer!',
    );
  }
};
